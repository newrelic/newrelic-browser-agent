# Supportability Metrics Audit Checklist

Working checklist for pruning `docs/supportability-metrics.md`. Two passes:

1. **Code pass** (this file, sections A-C): confirm each flagged item against `src/`.
2. **Dashboard pass** (section D): confirm which tags Angler/dashboards actually use. Angler only accepts fully formed strings (no wildcards), so every tag we keep is a manual curation decision.

Verify an emitter exists with: `grep -rn "<fragment>" src` (also check for templated construction, e.g. `` `Foo/${x}/Bar` ``).

---

## A. Documented but no emitter found in `src/`

Grep found nothing emitting these. Last commit that touched the string is a pointer for history, not proof of intent.

- [ ] `Generic/CSPViolation/Detected` - last touched `65b5b988c` (CSP violations became events, #1736). Confirm the SM was intentionally replaced by the event.
- [x] `Generic/Obfuscate/Invalid` (confirmed no emitter; removed from docs and Angler list) - last touched `a75f935d9` (obfuscator reads rules config directly, #1327). Confirm invalid-rule detection no longer exists.
- [ ] `Generic/Resources/Ajax/Internal` - last touched `e4c7debe2` (page resource assets, #1257). Original: `c5b433710`.
- [ ] `Generic/Resources/Non-Ajax/Internal`
- [ ] `Generic/Resources/Ajax/External`
- [ ] `Generic/Resources/Non-Ajax/External`
- [x] `Config/LongTask/Enabled` (doc entry removed; superseded by generated `Config/*`) - last touched `304e3954d` (long task removed, #1153). Doc entry is leftover.
- [x] `Config/SessionReplay/InlineStylesheet/Modified` (doc entry removed; superseded by generated `Config/*`) - last touched `a21b93988` (stylesheet status notifications, #1190). Only `recorder-events.js` references stylesheet inlining now, with no SM.

For each: check whether Angler still has the tag and whether the dashboard still charts it (section D).

## B. Bugs in existing metrics

- [x] **Resolved by removal:** the hand-written `Config/SessionReplay/*/Modified` metrics were deleted in favor of generated `Config/*` tags. Previously `session_replay/aggregate/index.js:121` emitted `Config/SessionReplay/InlineImages/Modifed` but the docs say `Modified`. Decide which spelling Angler has. Fixing the code splits the time series, so this must be coordinated with the Angler tag.
- [ ] **`SessionReplay/Abort/undefined`** is documented as a real tag. It fires when an abort reason has no `.sm`. Fix the caller and drop the doc entry, or keep as a canary.
- [ ] **Doc formatting:** `* <!--- Agent running in an IFrame was Detected --->` (docs line 112) has the comment inside the bullet. Cosmetic.
- [ ] **Doc copy/paste:** `Generic/Performance/NrResource/Seen` carries the "first party" description. Cosmetic.

## C. Candidates to drop or demote (judgment calls)

Check each against the code question first, then against dashboards (section D).

| Done | Metric(s) | Where emitted | Question |
| ---- | --------- | ------------- | -------- |
| [x] | `Generic/VideoElement/Added`, `Generic/IFrame/Added` | `metrics/aggregate/index.js` (MutationObserver over `document.body`) | Only metric family with ongoing runtime cost on every page (subtree observer). Does anyone still consume it? |
| [ ] | `rrweb/node/<type>/bytes` | `session_replay/shared/recorder.js:187` | Fires per rrweb event. Volume vs. value? |
| [ ] | `audit/*` (`page_view`, `session_replay` hasReplay/hasTrace/hasError) | `metrics/aggregate/harvest-metadata.js` | QA-style check that also emits true-negatives on every page. Proven out yet? |
| [ ] | `Generic/BFCache/PageRestored` | `metrics/aggregate/index.js` `eachSessionChecks` | Code comment says `[Temporary]`. Still needed? |
| [ ] | `Generic/Performance/FirstPartyResource/Seen`, `.../NrResource/Seen`, `.../Resource/Seen`, `.../mark|measure/Seen` | `generic_events/aggregate/index.js` | Redundant with the events themselves? |
| [ ] | `WebSocket/Completed/Seen`, `WebSocket/Completed/Bytes` | `generic_events/aggregate/index.js:286` | Still experimental/flagged. Keep until GA? |
| [ ] | `Ajax/Events/{Excluded,Payload,GraphQL}/*`, `Ajax/Metrics/Excluded/*` | `ajax/aggregate/index.js`, `soft_navigations/aggregate/ajax-node.js` | Payload capture adoption tracking. Done once adoption is known? |
| [ ] | `SoftNav/Interaction/{Extended,TimeOut,InitialPageLoad/Duration/Ms}` | `soft_navigations/aggregate/index.js` | Still answering a live question? |
| [ ] | `SessionReplay/Harvest/Attempts` | `session_replay/aggregate/index.js:241` | Overlaps with harvest/connect metrics? |
| [ ] | `Session/RaceCondition/Seen`, `Generic/TimeKeeper/*` | `harvest/connector.js`, `timing/time-keeper.js` | Diagnostic for a fixed bug or ongoing? (`InvalidTimestamp/Seen` is emitted in two places: `connector.js:162` and `page_view_event/aggregate/index.js:234`.) |

## D. Dashboard pass (reverse check)

For every tag currently in Angler, mark one:

- **Keep:** answers a live question.
- **Keep-but-cheaper:** want the signal, not the per-page cost.
- **Drop:** nobody reads it.

Record the Angler tag list here (paste or link) and reconcile against `docs/supportability-metrics.md`:

- [ ] Tags in Angler but NOT in the docs (unknown or orphaned)
- [ ] Tags in the docs but NOT in Angler (emitted but never aggregated - dead weight sent on every harvest)
- [ ] Templated families, decide per value since Angler needs each string: `API/<name>/called` (~50), `Framework/<name>/Detected` (24), `Generic/LoaderType/*`, `SessionReplay/Abort/*`, `Logging/Abort/*`

## E. Feature flag observation (design note)

Goal: emit a metric for every entry in `init.feature_flags`, with Angler's tag list as the only gate.

- [ ] Emit from the **metrics feature once** (`singleChecks`), not from `AggregateBase`. The current uncommitted loop in `aggregate-base.js` runs for every feature, so each flag is counted about 10x per pageview.
- [ ] Flags are read from `init` at load (not the RUM response), so they are available in the constructor.
- [ ] Decide name shape: `Feature_Flag/<flag>/Seen` (current WIP). Confirm it matches what Angler will be given.
- [ ] Note that flag-like state also lives in `init` via experimental booleans (`api.register.enabled`, `performance.resources.enabled`, `api.register.allow_iframe_bridge`). Those getters return true for either the flag or the explicit setting. If "was `register` used" should count both routes, report from the getter instead of the raw flag array.
