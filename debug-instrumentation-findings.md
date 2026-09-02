# `agent.debug()` instrumentation — scoping findings

**Update 3 (2026-09-01):** added `opts.listeners` -- the actual fix for
"why does `jserrors.debug()` show nothing from the instrument side."
Scanned every feature's `Instrument` class: **9 of 11 have zero own
public methods at all**, just a constructor -- `jserrors` is typical, not
an exception (only `page_view_event` and `session_replay` have one real
method each). All the real work is anonymous closures registered in the
constructor via `this.ee.on(...)` or `globalScope.addEventListener(...)`,
invisible to prototype-wrapping no matter what. Two new mechanisms in
`instrument-prototype.js` address this without patching anything new and
risky:
- `instrumentEventEmitter` -- extends the existing `eventEmitter` wrapping
  so `this.ee.on()`-registered listeners (e.g. jserrors' `internal-error`
  handler) get wrapped too, logged when they actually fire. Correctly
  preserves `removeEventListener` symmetry by storing the wrapper *on* the
  original function (via `getOrSet`, the same technique this codebase's
  own `wrap-events.js` already uses for the same reason) so a later
  `removeEventListener(type, originalFn)` call still finds and removes it.
- `instrumentDomListeners` -- rather than writing a new native
  `addEventListener` patch (which would risk breaking `removeEventListener`
  for every listener on the page, not just the agent's), taps the
  **already-shipped** `wrap-events.js` mechanism (active whenever
  session_trace, ajax, or session tracking is enabled) and listens to its
  `fn-start`/`fn-end`/`fn-err` events. This is how jserrors' window
  `'error'`/`'unhandledrejection'` listeners become visible. Known gap: if
  none of those three features are enabled, `wrapEvents` never ran and this
  is a silent no-op -- not a bug, just an implicit dependency.

Verified live: `jserrors.debug({ listeners: true, eventEmitter: true })`
correctly logged `[<agentId>:dom-listener] anonymous [ErrorEvent]` when a
thrown error hit the window `error` listener, and traced `internal-error`
through to `[jserrors:event-buffer] addMetric`.

**Update 2 (2026-09-01):** `debug()` now takes an opts object --
`{ instrumentation=true, eventBuffer=true, eventEmitter=false }` -- and
labels changed to `<feature>:<module>` (e.g. `[generic_events:instrument]`,
`[generic_events:aggregate]`, `[generic_events:event-buffer]`). Verified
live: `eventBuffer` correctly logs `add`/`byteSize`/`isEmpty`/`get`/`clear`
on a feature's own `EventBuffer`. `eventEmitter` works but is honestly
labeled by **agent identifier**, not feature name (`[<agentIdentifier>:event-emitter]`)
since `agentRef.ee` is one object shared by every feature on that agent --
turning it on from any single feature's `.debug()` call logs every other
feature's `emit`/`buffer` traffic too. Confirmed live: enabling it via
`jserrors.debug({ eventEmitter: true })` produced a firehose of unrelated
`wrap-logger-start`, `storeSupportabilityMetrics`, and `log` events
interleaved with the one test event actually fired -- exactly the noise
this labeling scheme was meant to make visible rather than hide. Also
fixed a real bug found while wiring this up: `instrumentPrototype`
originally read `proto[key]` directly, which for a class getter (e.g.
`EventBuffer#length`) invokes the getter against the bare prototype object
-- outside any instance -- and throws, since private fields aren't
initialized until the constructor runs on a real instance. Fixed by
checking `Object.getOwnPropertyDescriptor(proto, key).value` and skipping
accessors.

Goal: when called, cause internal agent machinery to emit `console.debug` messages
on meaningful method calls, for local debugging. Perf is not a concern.

**Update — implemented and verified live (2026-09-01):** a proof of concept
now exists (`src/common/debug/instrument-prototype.js`,
`FeatureBase.debug()`, `InstrumentBase.debug()` cascade,
`AgentBase.debug()`) and was exercised end-to-end in a headless browser
against the real webpack build. It works, with one real limitation
discovered by actually running it: **a lot of feature "entry points" are
private class methods (`#apiStartOrRestartReplay`) or anonymous closures
registered as event-emitter listeners in the constructor**
(`this.ee.on(RECORD_REPLAY, () => this.#apiStartOrRestartReplay())`,
`registerHandler(PAUSE_REPLAY, () => { ... })`) — neither is a named
*public* prototype method, so prototype-wrapping can't see them. Calling
`agent.recordReplay()`/`agent.pauseReplay()` produced **no** debug output
for `session_replay`, even with debug on, because those API calls route
through exactly this pattern. What *did* log correctly: genuine public
prototype methods like `makeHarvestPayload`, `forceStop`,
`replayIsActive` — these fired both from internal harvester-driven calls
and from a direct call made in the test. This narrows what "debug a
feature's internals" actually means in practice: it shows you the
lifecycle/harvest-shaped public methods, not the API-triggered reactive
paths, unless those paths are refactored off anonymous closures onto named
methods (a much bigger, separate change, not part of this proof of
concept).

## Recommended design

Wrap methods at the **class prototype level**, once, at module load — not on
instances or via a `Proxy`. Since every instance of a class shares one
prototype, patching `SomeClass.prototype.someMethod` once catches every call
to `this.someMethod()` from any instance, regardless of which closure or
cross-feature reference is holding it. This avoids the main failure mode of
instance/Proxy wrapping: most internal features grab direct references to
each other in closures at construction time, before `debug()` is ever called,
so wrapping the outer `agent` object after the fact would miss those calls
entirely.

```js
function instrumentPrototype(proto, label) {
  for (const key of Object.getOwnPropertyNames(proto)) {
    const fn = proto[key]
    if (typeof fn !== 'function' || key === 'constructor') continue
    proto[key] = function (...args) {
      if (isDebugEnabled) console.debug(`[${label}] ${key}`, args)
      const result = fn.apply(this, args)
      if (isDebugEnabled) console.debug(`[${label}] ${key} ->`, result)
      return result
    }
  }
}
```

`debug()` then just flips a flag — cheap boolean check per call until enabled,
and it covers instances created before *and* after debug is turned on.

### Per-feature `.debug()` beats one global hook

Rather than a single `agent.debug()` that wraps everything, give each feature
its own `.debug()` (e.g. `agent.features.sessionReplay.debug()`) that scopes
`instrumentPrototype()` to just that feature's own classes. `agent.debug()`
becomes sugar that loops over every registered feature and calls its
`.debug()`.

- **Win:** signal-to-noise. A global wrap floods the console with
  ajax/metrics/page-view noise when you're actually chasing a
  session-replay bug.
- **Cost:** each feature needs a short, explicit list of "these are my
  classes" — one-time setup per feature, not per-method.
- **Gap:** doesn't capture cross-feature interaction (e.g. ajax triggering
  session-replay capture) unless multiple features' debug is on — see the
  event-bus gap below.

## Codebase inventory

### 1. Top-level agent object

`Agent` — `src/loaders/agent.js`, extends `AgentBase` (`src/loaders/agent-base.js`),
which extends `ApiBase` (`src/loaders/api-base.js`). `ApiBase` holds the public
API: `addPageAction`, `setPageViewName`, `setCustomAttribute`, `noticeError`,
`setUserId`, `log`, `start`, `recordReplay`, `pauseReplay`, `addToTrace`,
`interaction`, `wrapLogger`, `measure`, `consent`, `register`, etc. Every
public method calls a private `#callMethod` that dispatches through the event
system (`handle`). No existing `.debug()`-style diagnostic toggle exists today.
Config-ish singletons (`agent.info`, `agent.runtime`, `agent.init`) are plain
objects merged via `mergeInfo`/`mergeRuntime`/`mergeInit` in
`src/common/config/`, not methods.

### 2. Feature base classes and concrete features

Base classes: `src/features/utils/feature-base.js` (`FeatureBase`),
`src/features/utils/instrument-base.js` (`InstrumentBase`),
`src/features/utils/aggregate-base.js` (`AggregateBase`).

Concrete classes live at `src/features/<feature>/instrument/index.js` and
`src/features/<feature>/aggregate/index.js` for: `ajax`, `generic_events`,
`jserrors`, `logging`, `metrics`, `page_action`, `page_view_event` (+
`aggregate_v2`), `page_view_timing`, `session_replay`, `session_trace`,
`soft_navigations` (SPA). Extra aggregate classes:
`soft_navigations/aggregate/interaction.js`,
`soft_navigations/aggregate/initial-page-load-interaction.js`,
`ajax/aggregate/ajax-node.js`.

### 3. Classes vs. closures/factories — mixed

Features/aggregators are real ES6 classes → prototype-wrapping applies
cleanly. But a lot of the core "wrap" machinery is closures/factories
returning plain functions, e.g. `wrapFetch(sharedEE, agentRef)` and
`createWrapperWithEmitter(emitter, always, agentRef)` in
`src/common/wrap/wrap-fetch.js` and `src/common/wrap/wrap-function.js` — no
shared prototype to patch. Same for `handle()` / `registerHandler()`.

### 4. Central event bus — function-based, not class-based

- `src/common/event-emitter/handle.js` — exports `handle(type, args, ctx, group, ee)`,
  buffers/emits on a contextual event emitter.
- `src/common/event-emitter/register-handler.js` — exports
  `registerHandler` / `defaultRegister(type, handler, group, ee)`, stores
  handlers in `handlers[group][type]`.
- `src/common/event-emitter/contextual-ee.js` — underlying `ee`
  emitter/namespace implementation.
- `src/common/event-emitter/event-context.js` — per-call context.

Most cross-feature traffic (e.g. ajax triggering session-replay capture)
flows through `handle`/`registerHandler`. **This is the gap**: prototype
wrapping can't reach it, since these are plain exported functions with no
shared prototype. Seeing this traffic would need a direct, one-time wrap of
`handle`/`registerHandler` themselves (a debug-flag check inserted directly
in those two functions) — a separate, small mechanism from the prototype
trick.

### 5. Standalone functions destructured on import (unreachable by prototype-wrapping)

- `getModeledObject` — `src/common/config/configurable.js`
- `mergeInfo`, `isValid` — `src/common/config/info.js`
- `mergeRuntime` — `src/common/config/runtime.js`
- `mergeInit` — `src/common/config/init.js`
- `wrapFetch`, `scopedEE` — `src/common/wrap/wrap-fetch.js`
- `createWrapperWithEmitter`, `copy` — `src/common/wrap/wrap-function.js`
- `handle` — `src/common/event-emitter/handle.js`
- `deregisterDrain` — `src/common/drain/drain.js`

These are destructured by name at import time; reassigning the export later
doesn't affect already-bound call sites, so they'd need to be wrapped at
their own declaration site, not patched from outside.

### 6. Rough scope

`export class` count across `src/` (excluding tests): **61 classes**.
Realistic maximal coverage via prototype-wrapping: **~50-60 classes**,
concentrated in:
- `src/features/*/instrument/` and `*/aggregate/` (11 feature dirs, instrument
  + aggregate pairs)
- `src/features/utils/*-base.js` (3 base classes)
- `src/loaders/*` (`Agent`, `AgentBase`, `ApiBase`, `MicroAgent`, etc.)
- `src/common/*` singletons (config classes, session, event-context, storage
  managers)

`src/common/wrap/`, `src/common/event-emitter/`, and `src/common/config/`
are mostly closures/plain functions and would need the separate
direct-wrap strategy from section 4, not prototype-wrapping.

## Build impacts

Checked `tools/webpack/configs/common.mjs`: minification is Terser
(`terser-webpack-plugin`) with no `pure_funcs`/`DefinePlugin` stripping of
`console.*` calls, and no existing dev/prod code-elimination switch for
diagnostic code. There's already a precedent for `console.debug` shipping
in every build — `src/common/util/console.js`'s `warn()` helper — so this
codebase doesn't currently strip debug logging out of production bundles.
Implications:

- **Without a build-time gate, the instrumentation code ships in every
  bundle, permanently** — CDN prod/min builds included — not just a
  dev-only bundle. Terser will minify/mangle the wrapper functions like
  everything else, but their bytes are there in every build the same way
  `warn()`'s are today.
- To avoid that, this would need a new build-time exclusion mechanism that
  doesn't currently exist here (e.g. a `webpack.DefinePlugin` flag +
  dead-code elimination, or excluding the instrumentation module from the
  CDN loader entry points the way `env.cdn`/`public-path.cdn` are swapped
  via `NormalModuleReplacementPlugin` in `common.mjs`). That's new
  build-config work, not a drop-in.
- Alternative that avoids touching the build at all: ship the
  `instrumentPrototype` wrapping code in every build (small, since it's
  just one generic helper), but keep it inert (the `isDebugEnabled` check)
  unless explicitly turned on — same tradeoff `warn()` already makes,
  i.e. accept a small fixed bundle-size cost rather than add build
  complexity. This is the lower-risk option given there's no existing
  precedent for conditional stripping in this repo.
- Per-feature `.debug()` methods add a small amount of bundle size to
  *every* feature bundle (instrument + aggregate chunks for ajax,
  session_replay, etc.), even for consumers who never call `.debug()` —
  worth flagging since this repo already cares about chunk size (see the
  `splitChunks`/`webpackCacheGroup` setup in `common.mjs` splitting out
  `recorder`/`compressor`/`iframe-message-handler` as separate chunks
  specifically to keep the main bundle lean).

## Processing impacts

- **Steady-state cost when debug is off:** one extra function-call
  indirection plus a boolean check per wrapped method call, forever, once
  a prototype is instrumented — not measurable for most methods, but this
  is added permanently to the hot path of every feature (ajax
  intercepts, event handling, etc.), not just to a debug-only code path.
- **Cost when debug is on:** `console.debug` itself is comparatively
  expensive (string formatting, dev-tools serialization of args/return
  values), and some of the "important internals" have large payloads —
  session_replay snapshots/mutations, session_trace timing buffers,
  ajax request/response bodies. Logging those on every call risks a
  **probe effect**: turning on debug for the exact feature you're
  investigating can itself change its timing/memory behavior enough to
  mask or mimic the bug. Worth truncating/summarizing large args rather
  than logging them raw.
- **Initialization-order constraint:** prototype wrapping must happen
  before any instances are constructed (module load time), which means
  the instrumentation setup needs to hook into the feature
  bootstrap/registration sequence (wherever features are constructed —
  under `src/loaders/` and `src/features/utils/feature-base.js`) rather
  than being callable at arbitrary points later.
- **Idempotency:** need a guard against double-wrapping (calling
  `.debug()` twice, or hot-reload in dev, re-wrapping an already-wrapped
  method) — otherwise each call adds another indirection layer and
  duplicate log lines.
- **Cross-context duplication:** the agent can run in multiple contexts
  per page (main window + iframes, per project memory on
  `RegisteredIframeEntity`/MFE manifest handling) — each context
  constructs its own instances against the same (module-level) prototypes,
  so a debug flag flipped in one context's `Agent` instance needs to be
  scoped per-agent-instance, not a single module-level global, or
  debugging one entity's session replay would also start logging every
  other entity's on the same page.

## Affected files and changes needed

| File | Change needed |
|---|---|
| `src/common/debug/instrument-prototype.js` *(new)* | Shared `instrumentPrototype(proto, label)` helper implementing the prototype-wrap-once-with-flag-check pattern. |
| `src/common/debug/debug-state.js` *(new)* | Per-agent-instance (not module-global) debug flag storage, keyed off `agentRef`/`agentIdentifier` the way other per-instance state in this codebase already is. |
| `src/features/utils/feature-base.js` | Add a `.debug()` method that calls `instrumentPrototype` against the concrete instrument/aggregate classes registered for that feature. |
| `src/features/utils/instrument-base.js`, `aggregate-base.js` | Confirm/expose the class reference needed for prototype wrapping (may already be available via `this.constructor`). |
| `src/features/<feature>/instrument/index.js` and `.../aggregate/index.js` (11 features: `ajax`, `generic_events`, `jserrors`, `logging`, `metrics`, `page_action`, `page_view_event`(+`aggregate_v2`), `page_view_timing`, `session_replay`, `session_trace`, `soft_navigations`) | Each needs a short explicit list of "these are my classes" passed to the base's `.debug()` wiring — one-time per-feature registration, not per-method. |
| `src/loaders/api-base.js`, `agent-base.js`, `agent.js` | Add top-level `agent.debug()` that loops over `this.features` and calls each feature's `.debug()`; follow existing `#callMethod` dispatch convention already used for the rest of the public API. |
| `src/common/event-emitter/handle.js` | Direct wrap (not prototype-based): insert a debug-flag check + `console.debug` inside `handle()` itself, since this is the central event-bus function most cross-feature traffic flows through and prototype-wrapping can't reach it. |
| `src/common/event-emitter/register-handler.js` | Same direct-wrap treatment for `registerHandler`/`defaultRegister`, to log handler registration/dispatch. |
| `src/common/wrap/wrap-fetch.js`, `wrap-function.js` | Same direct-wrap treatment if fetch/XHR-level wrapping activity needs to be visible — these are closures, not classes, so must be wrapped at their own declaration site. |
| `tools/webpack/configs/common.mjs` | Only needed if a build-time exclusion approach (see Build impacts) is chosen — would add a `DefinePlugin` flag and/or a `NormalModuleReplacementPlugin` swap analogous to the existing `env`/`public-path` CDN swaps. Not needed if the "ship a small inert helper always" approach is chosen instead. |
| `docs/warning-codes.md` / `src/common/util/console.js` | Not required, but worth reviewing for consistency — this file is the existing convention for `console.debug` usage in the codebase and any new debug output should probably follow its formatting conventions rather than inventing a new one. |
