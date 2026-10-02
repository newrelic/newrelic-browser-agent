# CLAUDE.md

Shared, committed instructions for working on the New Relic Browser Agent
with Claude Code. This file applies to every engineer's session — it is not
personal configuration (personal preferences live in the gitignored
`.claude/settings.local.json` and are never committed here).

For product/onboarding context, see [README.md](README.md),
[DEVELOPING.md](DEVELOPING.md), and [CONTRIBUTING.md](CONTRIBUTING.md) — this
file doesn't repeat them, it covers what makes Claude's output here
predictable and reviewable on the first pass.

## Build & test commands

| Task | Command |
| ---- | ------- |
| Install | `npm ci` |
| Build CDN bundle locally | `npm run cdn:build:local` |
| Rebuild on every change | `npm run cdn:watch` |
| Full build (CDN + npm + test builds) | `npm run build:all` |
| Serve local test assets/agent | `npm run test-server` |
| Lint | `npm run lint` (`npm run lint:fix` to auto-fix) |
| Supportability metric registry check | `npm run supportability-metrics:check` (`npm run supportability-metrics:generate-docs` to regenerate the docs) |
| Unit tests | `npm run test:unit` |
| Component tests | `npm run test:component` |
| Single jest file | `npm run test:unit -- <path>.test.js` |
| Type tests | `npm run test:types` |
| e2e (wdio), single spec | `npm run wdio:smoke -- --no-retry tests/specs/<path>.e2e.js` |

`wdio` never builds the agent for you — rebuild before (re-)running specs.
Most specs only need `cdn:build:local`/`cdn:watch`, but anything loading
`test-builds/*-wrapper/**` (e.g. `tests/specs/npm/*.e2e.js`) needs the full
`build:all`, since those pages run against the packaged npm tarball, not the
CDN bundle. See [testing.md](.claude/rules/testing.md) for the full breakdown.

## Coding style

- ESLint (`standard` + `sonarjs`, config in [.eslintrc.js](.eslintrc.js)) is
  authoritative — run `npm run lint` rather than guessing at style.
- `src/**/*.js` forbids `console.*` (`no-console: error`) — use the agent's
  own logging/warning utilities instead.
- Add JSDoc (`@param`, `@returns`, `@type` on non-obvious fields) to exported
  functions/classes and to any non-trivial internal function or complex
  variable. This isn't just documentation here: [tsconfig.json](tsconfig.json)
  has `allowJs`+`declaration`+`emitDeclarationOnly` set, so the published
  `.d.ts` types (`npm run npm:build:types`) are generated directly from
  JSDoc on the `.js` source — missing or wrong JSDoc on a public API
  produces missing or wrong published types, not just missing comments.
- When a change touches a **primary interface** — a public API
  (`src/loaders/api/*.js`), anything exposed on the `newrelic`/`NREUM`
  globals ([src/common/window/nreum.js](src/common/window/nreum.js)), or a
  registered-entity-style interface (`src/interfaces/*.js`) — add/update a
  dedicated JSDoc typings file for the shape, following the existing
  pattern: a `*-api-types.js`/`*-types.js` file with `@typedef {Object} X` +
  `@property` entries (e.g.
  [src/loaders/api/register-api-types.js](src/loaders/api/register-api-types.js)),
  imported elsewhere via `@typedef {import('./register-api-types').X}`
  (e.g. [src/interfaces/registered-entity.js](src/interfaces/registered-entity.js)).
  Don't just inline the shape as an untyped object literal — these types
  flow straight into the published `.d.ts`, and consumers (including other
  New Relic teams building on `register()`) depend on them being accurate.
- Copyright headers on `src/**/*.js` are inserted/updated automatically by
  the pre-commit hook ([.husky/pre-commit](.husky/pre-commit)). Don't
  hand-write or hand-edit them.
- New `warn()` calls need a matching numbered entry in
  [docs/warning-codes.md](docs/warning-codes.md) — the pre-commit hook blocks
  the commit otherwise (`npm run check:warning-codes`).
- Any new supportability metric (a new string sent via
  `SUPPORTABILITY_METRIC_CHANNEL`/`reportSupportabilityMetric(ee, name, value)` from `src/common/event-emitter/report-supportability-metric.js` —
  the one way to report a metric from any feature or shared code — or the metrics feature's own `storeSupportabilityMetrics`) needs an entry in
  [tools/supportability-metrics/registry.js](tools/supportability-metrics/registry.js).
  [docs/supportability-metrics.md](docs/supportability-metrics.md) is **generated** from that registry
  (`npm run supportability-metrics:generate-docs`) — never hand-edit it. `npm run supportability-metrics:check` (run by the pre-commit hook
  and the "Supportability Metrics Check" CI job) statically scans `src/` and fails if a metric is emitted that the registry doesn't
  cover, if the registry lists a metric nothing emits, or if the docs are stale. A new literal name or `internal-error` reason must be added to the matching entry's
  `values`. Names only known at runtime (API names, loader types) are matched by shape and not verified, so keep those `values`
  lists in sync by hand (frameworks have a unit test). A reporting call whose name the scan can't work out (a variable or an imported constant) also fails the check, unless it is a genuine forwarder marked with an `sm-registry: forwards <where>` block comment on the line above. `npm run supportability-metrics:check -- --fix` appends a stub entry for each new metric and regenerates the docs, so you only write the description. The pre-commit hook runs it for you: it stubs the entry, stages the registry, `pending.js` and docs, and stops the commit until you have filled in the stub's description and committed again. CI runs the check read-only and fails with the file and line to fill in; it never edits anything.
  Every registered metric also gets a generated jest test (`tests/components/supportability-metrics/coverage.test.js`, run with
  `npm run supportability-metrics:test` and by the pre-commit hook) that proves the metric is actually reported. Make it pass by adding a
  *trigger* for the registry entry in `tests/components/supportability-metrics/triggers/`; a metric with no trigger fails unless it is
  listed in `pending.js`, which only warns (`--fix` adds new metrics there for you). Delete the `pending.js` line once the trigger passes. Step by step, with instructions for Claude: [tests/components/supportability-metrics/README.md](tests/components/supportability-metrics/README.md). Angler's shared `metric_names.txt` is updated by hand on the internal GitHub: when a PR changes the registry, the `sm-check` job comments with the exact names to add (the `Config/*` and feature flag names are derived from the `init` model and the source), what it cannot generate (status codes, audit combinations), and the instruction to open a PR against agents/angler and link it (see [tools/supportability-metrics/README.md](tools/supportability-metrics/README.md)). The registry also drives a generated New Relic dashboard (a preview per PR in staging, staging on merge, US prod with the release); a metric that reports a value needs `value: { unit }` in its entry.
- Match existing patterns in the file/directory you're editing over
  introducing a new abstraction, especially in `src/common` and `src/features/*`.

## Build size: loader vs. aggregate

The agent ships in two parts with very different cost profiles:

- **Loader** (`src/loaders/**`, each feature's `instrument/` folder) — inlined
  directly into the page's HTML/head, downloaded and parsed on every
  pageview before the page can do anything else. Every byte here is on the
  critical path.
- **Aggregate** (each feature's `aggregate/` folder) — lazy-loaded as a
  separate chunk after the page has already loaded, off the critical path.

When a change (new logic, a new dependency, an added code path) can
reasonably live in either half, **prefer putting it in aggregate over
loader**, even if that means slightly more plumbing (e.g. deferring work
across the instrument/aggregate boundary via the event emitter) than putting
it inline in `instrument/`. Loader-side growth affects page load for every
site running the agent; aggregate-side growth doesn't. CI reports bundle size
deltas per PR ([.github/actions/size-diff](.github/actions/size-diff)) — pay
attention to which bundle(s) grew, not just the total, and call out any
loader-size increase (and why it couldn't be avoided) in the PR description.

## Testing

See [.claude/rules/testing.md](.claude/rules/testing.md) (auto-loaded every
session — no import line needed, see
[Extending this file](#extending-this-file)).

A behavior change should ship with **both** a jest unit/component test and a
wdio e2e spec confirming it, as the default expectation — not just whichever
one is more convenient. Jest and wdio e2e are also equal citizens on an
ongoing basis: a later change extending behavior covered by one needs the
other kept in sync too. See the linked doc for full
conventions and a known e2e flakiness gotcha (auto-captured log sampling).

## Pull requests

See [.claude/rules/pr-guidelines.md](.claude/rules/pr-guidelines.md).

PR title and description format is CI-enforced. See the linked doc before
drafting any PR title/description in this repo.

@.claude/commands/create-pr.md

Favor using the above command and its heuristics when creating an automated pull request.

## Architecture invariants

See [.claude/rules/architecture-invariants.md](.claude/rules/architecture-invariants.md).

A short list of behaviors that look like bugs but are intentional. Read
before "fixing" `deregister()`/`registeredEntities` retention or `register()`
manifest attribution.

## Known issues

See [.claude/rules/known-issues.md](.claude/rules/known-issues.md).

Confirmed-but-unfixed bugs, tracked by GitHub issue number.

## Formatting

See [.claude/rules/formatting.md](.claude/rules/formatting.md).

## Before you finish a task

Run through this before presenting code as done or opening/updating a PR —
catching these here is strictly faster than waiting for the pre-commit hook
or CI to catch them:

1. `npm run lint` passes on changed files.
2. Jest coverage added/updated for the behavior change, **and** a matching
   wdio e2e spec added/updated (or an explicit note on why e2e coverage isn't
   feasible) — see [Testing](#testing).
3. Any new `warn()` call has a corresponding entry in
   [docs/warning-codes.md](docs/warning-codes.md).
4. Any new supportability metric is in
   [tools/supportability-metrics/registry.js](tools/supportability-metrics/registry.js) and the docs were regenerated with
   `npm run supportability-metrics:generate-docs` (`npm run supportability-metrics:check` passes), and it has a trigger in
   `tests/components/supportability-metrics/triggers/` (`npm run supportability-metrics:test` passes).
5. Any public API change has matching type updates (`npm run test:types`).
6. New code that could live in either `instrument/` (loader) or `aggregate/`
   was placed in `aggregate/` unless there's a concrete reason it can't be —
   see [Build size: loader vs. aggregate](#build-size-loader-vs-aggregate).
7. PR title/description follow [pr-guidelines.md](.claude/rules/pr-guidelines.md) exactly.
8. No unrelated "cleanup" of anything listed in
   [architecture-invariants.md](.claude/rules/architecture-invariants.md).

## Offer to open a PR when a task is done

When the checklist above is satisfied and the change is committed on a
non-`main` branch, don't just stop and wait to be asked — **offer** to open
(or update) the PR, drafting the title/description per
[pr-guidelines.md](.claude/rules/pr-guidelines.md) so the human only has to
review and confirm, not dictate the format from scratch. Still treat actually
running `gh pr create`/pushing as an action that needs the human's go-ahead
first (per this repo's normal "confirm before shared-visibility actions"
rule) — offer and draft, don't create unilaterally. Skip the offer when the
work is clearly not PR-ready yet (a checklist item above is unresolved, the
user said they're still iterating, or there's no commit yet).

## Extending this file

Keep this root file short — it's loaded into every session. To add a new
persistent, team-wide rule:

1. Put the detailed content in a new `.claude/rules/<topic>.md` file. Every
   `.md` file under `.claude/rules/` is loaded automatically every session —
   no import line needed, so this file doesn't need hand-maintaining as
   `.claude/rules/` grows.
2. Add a short section here (like the ones above) linking to it with a
   one-sentence summary of when it matters, purely for human skimmability —
   the content itself is already loaded regardless of whether this file
   links to it.
3. Keep anything personal, speculative, or credential-bearing out of this
   file and out of `.claude/rules/` — that belongs in each engineer's own
   (gitignored) `.claude/settings.local.json` or personal notes, never here.
