# Architecture invariants ("looks like a bug, isn't")

These behaviors have been raised as suspected bugs before and, after
investigation, confirmed intentional. If asked to "fix" or "clean up" one of
these again, explain the invariant instead of changing the behavior — unless
the requirements underneath have genuinely changed.

## `deregister()` never removes entries from `registeredEntities`

`deregister()` in [src/loaders/api/register.js](../../src/loaders/api/register.js)
(the `newrelic.register` MFE API) only sets `target.blocked = true` — it never
splices the entity out of `agentRef.runtime.registeredEntities`.

**Why:** `registeredEntities` isn't just an internal index; it's used for
*passive* attribution — matching asynchronously-arriving errors/resource-timing
entries back to a target by filename/id (`getRegisteredTargetsFromFilename`,
`findTargetsFromStackTrace` in [src/common/v2/utils.js](../../src/common/v2/utils.js)),
not just gating active API calls. Splicing an entity out immediately on
deregister would break that correlation for any in-flight/async event tied to
a since-deregistered entity, even though `blocked` already correctly no-ops
future explicit `report()` calls. Unbounded array growth is a real but lesser
cost than losing attribution correctness.

**If this needs revisiting:** the fix would need to distinguish "stop
accepting new explicit calls" (already handled by `blocked`) from "stop being
eligible for passive async attribution" (needs a grace period or generation
counter, not immediate removal) — it's not a simple splice.

## `register()` manifest attribution excludes the caller script when a manifest is present

In [src/common/v2/utils.js](../../src/common/v2/utils.js)
(`getRegisteredTargetsFromFilename`, `getRegisteredTargetsFromResourceUrl`):
when a `register()` target has a `manifest`, attribution relies **solely** on
manifest matching — the `timings.asset` (caller-script) fallback is gated
behind `!target.manifest`.

**Why:** a platform-level "registrar" script can call `register()` on behalf
of many MFE teams, using each MFE's manifest to name only that MFE's own
files. Without this exclusion, the registrar's own errors/ajax/logs/resources
would attribute to every MFE it registered (since the caller-script fallback
was previously OR'd with manifest matching), even though the registrar script
doesn't belong to any MFE team.

**If this needs revisiting:** the invariant is "if `target.manifest` is
present, it is the sole source of truth for attribution — no caller-script
fallback." Tests: unit cases in `tests/unit/common/util/v2.test.js`
("registrar scenario"), e2e in `tests/specs/api/register/manifest.e2e.js`
("never attributes a registrar script's own activity...").
