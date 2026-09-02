# SR data debugging tools — SPIKE recommendation (NR-458133)

## Ticket context

Re: Levi's high-volume Session Replay (SR) data, this SPIKE asks for
recommendations on tools customers/support could use to inspect and debug
SR data — specifically to identify which event/node *types* are driving
overall payload size. Two options were named in the ticket:

1. **Console debug**
2. **Flag to disable compression**

Pik Tang's investigation (comments, 2026-01-29/30) already ruled out most
of the ingest-side approaches:

- The O11y-services endpoint can't be used due to legal constraints, so
  analysis needs to happen **pre-ingest**, not by querying stored data.
- A **POC JS snippet run in the browser console** proved this is feasible:
  since SR data can be inspected before compression, a snippet can print
  basic analysis + event data straight to console.
- **Disabling compression was explored and rejected**: uncompressed SR
  payloads routinely exceed 1MB, which causes SR to shut down and lose
  data entirely. Pik's POC instead reads event data *before* compression
  happens, without needing to disable it.

## Recommendation

**Pursue "console debug," not "disable compression."** Pik's finding
that disabling compression risks payload sizes that shut SR down entirely
is a hard blocker — recommend closing out that option rather than pursuing
it further.

For console debug, recommend building this as a **real, reusable agent
capability** rather than a one-off JS snippet customers/support paste into
devtools each time. This session's work (this branch) already implements
exactly that: an `agent.debug()` / `feature.debug(opts)` mechanism that
turns on structured `console.debug` output for a feature's internals,
callable directly from devtools on any page running the agent, with no
snippet to maintain or distribute. It generalizes Pik's "peek at data
before compression" approach into agent-native tooling.

## What's already built and verified

Implemented and tested live against the real webpack build (headless
browser, mocked RUM/connect responses) as part of this session:

- `feature.debug(opts)` — inherited by every feature (session_replay
  included) via `FeatureBase`. Opts:
  - `instrumentation` (default on) — logs a feature's own class methods
    (args + return values), labeled `[<feature>:instrument]` /
    `[<feature>:aggregate]`.
  - `eventBuffer` (default on) — logs activity on a feature's event
    storage, labeled `[<feature>:event-buffer]`.
  - `eventEmitter` (opt-in) — logs activity on the shared event emitter,
    including registered listeners firing, labeled `[<agentId>:event-emitter]`.
  - `listeners` (opt-in) — logs DOM (window/document/XHR) listeners
    firing, labeled `[<agentId>:dom-listener]`.
- `agent.debug(opts)` / `agent.debugEvents()` — agent-wide convenience and
  a separate global lifecycle/dispatch-event log (init, load, drain,
  harvest, api calls, warnings).
- Debug output is routed through the pre-agent native `console.debug`
  reference (captured in `gosNREUMOriginals().o.DEBUG`), so it does **not**
  get picked up and re-harvested as real log data by the logging feature's
  own console auto-capture — an early version of this tooling would have
  caused exactly that loop.

**Caveat specific to SR**: `session_replay`'s aggregate does not use the
generic event buffer that most other features use (it has its own
recording/compression storage) — see `AggregateBase#setupEventStore`'s
explicit skip for `FEATURE_NAMES.sessionReplay`. That means today,
`session_replay.debug({ eventBuffer: true })` shows nothing extra for SR
specifically; `instrumentation`, `eventEmitter`, and `listeners` still
work for SR the same as any other feature (e.g. `importRecorder`,
`#apiStartOrRestartReplay`'s cascading emit activity).

## Proposed follow-up: SR-specific size-by-type breakdown

To actually answer "which types contribute to overall size" (the ticket's
core question), recommend a follow-up ticket to add an SR-specific
extension to `session_replay.debug()` that surfaces, pre-compression:

- Per-event-type counts and byte sizes (e.g. mutation nodes, style
  recalculations, custom events) as they're recorded, before the
  compressor runs.
- A running total of pre-compression size vs. the actual post-compression
  harvested payload size, so the compression ratio is visible too.

This is the piece that most directly answers the ticket's motivating
question, and it's a natural, small extension of the mechanism already
built and verified here — not a new architecture.

## Build impacts

- No build-time exclusion mechanism exists in this codebase today for
  diagnostic/debug code (checked `tools/webpack/configs/common.mjs` —
  Terser has no `pure_funcs`/`DefinePlugin` stripping of `console.*`, and
  `console.js`'s existing `warn()` helper already ships `console.debug`
  calls in every build unconditionally). This tooling follows that same
  precedent: it ships in every build, at a small, fixed bundle-size cost,
  rather than requiring new build-config work to strip it from
  production bundles.
- The added code is small and shared (`src/common/debug/instrument-prototype.js`
  plus a `debug()` method added to shared base classes), not duplicated
  per feature — so the marginal size added to any one feature's chunk
  (including SR's async chunks) is minimal.

## Processing impacts

- **Steady-state cost when off**: one extra function-call indirection and
  a boolean check per wrapped method call, added permanently once a class
  is instrumented — not measurable in practice, but it is on the hot path
  regardless of whether debug is ever turned on for a given page load.
- **Cost when on**: `console.debug` itself has real overhead (devtools
  serialization of args/return values), and for SR specifically this
  matters more than for most features — a busy page can generate a very
  high volume of recording events (DOM mutations, style changes), so
  turning on `eventEmitter`/`listeners` logging during an actual
  high-volume recording session could itself change timing/memory
  behavior enough to mask or mimic the very size problem being
  investigated (a probe effect). Recommend the size-by-type breakdown
  (above) aggregate and summarize rather than log every single raw event,
  to avoid this.
- **Scope honesty**: `eventEmitter` and `listeners` are agent-wide, not
  feature-scoped — the event emitter and DOM listener wrapping mechanisms
  are shared infrastructure, not owned by any one feature. Turning them on
  via `session_replay.debug({ eventEmitter: true })` will also log other
  features' emitter/listener activity on the same agent. This is called
  out directly in the console output's labeling (`[<agentId>:...]` rather
  than `[session_replay:...]`) so it isn't mistaken for SR-only data.

## Console output examples

_Screenshots to be added — placeholders below._

### Enabling debug on session_replay

<!-- screenshot: agent.features.session_replay.debug() + resulting console output -->

### Event buffer / event data output

<!-- screenshot: [session_replay:...] event/data-shaped console output -->

### Event emitter / listener activity output

<!-- screenshot: [<agentId>:event-emitter] / [<agentId>:dom-listener] console output -->

## Suggested next steps / tickets to create

1. Land the `.debug()` infrastructure itself (this branch) — feature/aggregate
   base classes, event-buffer/event-emitter/listener wrapping, the
   logging-feature-loop fix.
2. SR-specific pre-compression size-by-type breakdown extension (the piece
   that most directly answers this ticket's motivating question).
3. Close out "flag to disable compression" as not viable, citing the
   >1MB/SR-shutdown finding, so it doesn't get re-litigated later.
4. (Optional) A short support/customer-facing runbook for using
   `session_replay.debug()` when investigating a high-volume SR report.
