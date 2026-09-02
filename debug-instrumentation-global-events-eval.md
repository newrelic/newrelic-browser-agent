# Alternative: `.debug()` subscribes to global dispatch events

**Update — implemented as `debugEvents()` and verified live (2026-09-01):**
`AgentBase.debug()` was left for the prototype-wrapping mechanism;
this one is exposed as `agent.debugEvents()` to keep the two mechanisms
distinguishable while testing. Implementation: `debugEvents()` adds a
`window.addEventListener(GLOBAL_EVENT_NAMESPACE, ...)` listener
(`src/loaders/agent-base.js`), guarded against double-subscription. It
works exactly as expected -- but a real timing problem showed up
immediately when tested against the live build: a raw `window` listener
attached via `page.addInitScript` (i.e. before any page script runs at
all) recorded `initialize` at **t=18ms**, `load`/`session`/`drain` around
**t=20-26ms**, and the first `harvest` at **t=30ms** after navigation.
Calling `debugEvents()` from devtools at +500ms (the earliest a human
could plausibly react) caught **none of that** -- only a manually
triggered `addPageAction` API event fired afterward showed up. In
practice this means **`debugEvents()` is only useful if called before the
agent script runs** (e.g. injected into the loader snippet itself, or via
a devtools "on page load" breakpoint/init script), not interactively after
the fact -- for interactive debugging, only the recurring `harvest` events
and later `api`/`warn` events would still be visible. This is a much
bigger practical limitation than the "6 call sites" coverage gap
originally flagged below; it affects the *lifecycle* events specifically,
which are exactly the ones interactive debugging would care about most
("did my agent actually initialize/load/drain").

Idea: instead of (or alongside) prototype-wrapping (see
`debug-instrumentation-findings.md`), have `.debug()` just add a listener
to the agent's existing global event dispatch and `console.debug` whatever
comes through.

## What this mechanism actually is

`src/common/dispatch/global-event.js`:

```js
const GLOBAL_EVENT_NAMESPACE = 'newrelic'
export function dispatchGlobalEvent (detail = {}) {
  globalScope.dispatchEvent(new CustomEvent(GLOBAL_EVENT_NAMESPACE, { detail }))
}
```

It fires a `CustomEvent('newrelic', { detail })` on `window`
(`globalScope`). This is **already a supported external interface** — the
comment at the one call site literally says "let any window level
subscribers know that the agent is running, per install docs"
(`src/common/util/feature-flags.js`). So `.debug()` doing this would just
mean: add another consumer of an event stream that's already public and
already dispatched today, regardless of whether anyone listens.

`.debug()` implementation would be close to:

```js
debug () {
  globalScope.addEventListener('newrelic', (e) => console.debug('[agent]', e.detail))
}
```

## Coverage: who actually dispatches this event today

Only **6 call sites** in the whole codebase (`grep -rl dispatchGlobalEvent src`):

| File | `type` / `name` | What it tells you |
|---|---|---|
| `src/loaders/configure/configure.js` | `lifecycle` / `initialize` | Agent config finished initializing, includes `agent.config` |
| `src/common/util/feature-flags.js` | `lifecycle` / `load` | Which features were activated (`flags`) |
| `src/common/drain/drain.js` | `lifecycle` / `drain` | A feature group's buffered events were drained/activated |
| `src/features/page_view_event/instrument/index.js` | `window` / `DOMContentLoaded`, `load`; `lifecycle` / `session` | Page lifecycle timing events, session update |
| `src/common/harvest/send.js` | `data` / `harvest` | An outgoing harvest payload (`endpoint`, `headers`, `payload`, `raw`) |
| `src/loaders/api/sharedHandlers.js` | `data` / `api` | Any public API method was called (name only, not args) |
| `src/common/util/console.js` (`warn()`) | `data` / `warn` | A warning code fired, with its secondary data |

That's the entire surface. It's a curated set of **major milestones**
(init, feature load, drain, harvest, API-called, warnings) — not the deep
per-method internals of a feature. It answers "did the agent start up,
activate my features, drain, and send data?" well. It does **not** answer
"why did session replay capture the wrong DOM node" or "why did this one
ajax call get missed" — there is no dispatch inside `session_replay`'s
recorder, `ajax`'s wrap-fetch interception, `soft_navigations` interaction
tracking, etc. Those stay invisible to this mechanism entirely.

## Comparison with prototype-wrapping

| | Global-event listener | Prototype-wrapping |
|---|---|---|
| Implementation effort | Trivial — one `addEventListener` call | Significant — new helper, per-feature class registration, base-class changes |
| Build impact | **None** — `dispatchGlobalEvent` already ships and already fires today; `.debug()` only adds a listener, doesn't add new dispatch call sites | Ships new wrapping code in every bundle (see other file's Build impacts section) |
| Processing impact when off | **None** — dispatch already happens unconditionally today whether or not `.debug()` was ever called | Extra indirection on every wrapped method call, forever, once instrumented |
| Processing impact when on | Low — only 6 dispatch sites, and only `harvest`'s payload is large | Higher — every wrapped method call logs, including hot paths and large per-feature payloads (session replay snapshots, etc.) |
| Coverage depth | Shallow — milestones only | Deep — every method on every wrapped class |
| Risk of breaking existing behavior | **None** — purely additive, doesn't touch dispatch call sites, which are an existing public/documented interface | Some — mutating prototypes at load time, ordering constraints, idempotency guards needed |
| Multi-instance / iframe safety | **Gap** — dispatch is on `window`/`globalScope` with no agent-identifier in most `detail` payloads, so multiple `Agent` instances on one page (main + iframe/MFE entities, per project notes on registered-iframe entities) would interleave into one stream with no easy way to tell them apart | Same gap exists but is easier to fix, since wrapping happens per-instance's class references and a label can include the agent identifier |

## Recommendation

This is worth doing, but as a **complement, not a replacement** — it's
free (no build cost, no added processing, zero risk to existing dispatch
sites) and gives a coarse "is the agent alive and doing its major
lifecycle steps" view essentially for free. But because the dispatch
surface is only 6 hand-picked call sites, it will not satisfy "debug a
specific feature's internals" requests (session replay, ajax, etc.) — for
that, the per-feature `.debug()` + prototype-wrapping approach in
`debug-instrumentation-findings.md` is still needed.

Two follow-ups if this is pursued:
- **Namespace collision risk**: since `'newrelic'` is a public,
  documented event name, `.debug()`'s listener would receive *everything*
  any external integration also receives — nothing more. No new privacy/
  exposure surface is created, since it's the same data external
  subscribers can already see.
- **Multi-instance labeling**: consider whether `detail` payloads should
  start including an agent/entity identifier (they mostly don't today) so
  a page running multiple agent instances (iframe/MFE case) can be
  distinguished in the console output — this would be a small, low-risk
  addition to the existing dispatch call sites, and would benefit external
  subscribers too, not just this debug feature.
