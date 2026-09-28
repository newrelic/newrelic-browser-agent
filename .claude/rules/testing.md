# Testing guidelines

## Baseline: every behavior change gets a jest test AND a wdio test

A code change that adds or modifies behavior should be accompanied by **both**
a jest unit/component test and a wdio e2e spec (`tests/specs/**/*.e2e.js`)
confirming the core behavior change — not just one or the other, and not as a
follow-up. This is the default expectation for new work, not something that
only kicks in once one of the two already exists.

- Skip e2e coverage only when the behavior genuinely cannot be exercised
  black-box (e.g. it requires mocking an internal clock or injecting a value
  into a closure), and skip jest coverage only when the behavior can't be
  isolated below the browser/e2e level — in either case, say so explicitly
  in the PR rather than silently omitting it.
- You are not expected to execute wdio yourself by default (it needs
  LambdaTest credentials and a built agent — see the build note below); still
  write/extend the spec as part of finishing the task.

## Jest and wdio e2e are equal citizens

Beyond the baseline above: this repo does not treat unit tests as "primary"
and e2e as optional. If a later change adds to or modifies behavior that
existing jest tests cover, extend the matching wdio e2e spec for the same
behavior too (and vice versa) — don't let one suite silently fall behind the
other over time.

## Unit tests (jest)

Full conventions: [../../docs/unit-testing.md](../../docs/unit-testing.md). Summary:

- **DO** name/colocate the test file next to its source file, `<name>.test.js`.
- **DO** use `describe` only to group tests sharing setup/teardown — never one
  global `describe` wrapping the whole file.
- **DON'T** use `beforeAll`/`afterAll`. **DO** use `beforeEach`/`afterEach` —
  tests must not share state and must be safe to run in isolation or parallel.
- **DO** use `async`/`await`, not promise chains.
- **DO** keep each test case to a single scenario.
- Stateless source files: `import` at the top of the file. Stateful source
  files: `await import()` inside the test/`beforeEach`, and `jest.resetModules()`
  in `afterEach`.

Commands: `npm run test:unit`, `npm run test:component`, or target one file
with `npm run test:unit -- <path/to/file>.test.js`.

## wdio e2e

Specs live in `tests/specs/**/*.e2e.js`. `wdio` does not build the agent for
you — you must rebuild after every source change before (re-)running specs.
`LT_USERNAME`/`LT_ACCESS_KEY` env vars are required to run against LambdaTest.
Run a single spec with `npm run wdio -- tests/specs/<path>.e2e.js`.

**Which build you need depends on what the spec loads:**

- **Most specs** load assets served out of `/build`, which only needs the CDN
  bundle: `npm run cdn:build:local` (or `npm run cdn:watch` to rebuild
  automatically on every source change while you iterate).
- **`tests/specs/npm/*.e2e.js`** (and anything else under `tests/specs/**`
  that loads `test-builds/*-wrapper/**` pages, e.g. `browser-agent-wrapper`,
  `raw-src-wrapper`) load pages built against the **packaged npm output**
  (`tools/test-builds/browser-agent-wrapper` depends on the tarball at
  `temp/newrelic-browser-agent-*.tgz`, produced by `npm run build:npm`/`npm:pack`).
  A `cdn:build:local`-only rebuild will not update these — you need the full
  `npm run build:all` (which runs `cdn:build:local && build:npm && tools:test-builds`
  in that order) before rerunning them.

If an npm-build-dependent e2e test doesn't reflect a source change you just
made, check whether you rebuilt with `build:all` rather than just
`cdn:build:local`/`cdn:watch` before assuming it's a product bug.

### Known flakiness source: auto-captured log sampling

`tools/testing-server/constants.js` (`rumFlags`, `getNextLogValue`) cycles a
shared, process-global counter across every RUM/connect call in the whole test
run to pick the auto-captured logging sample rate (OFF/ERROR/WARN/INFO/DEBUG/TRACE).
Any e2e test that asserts on auto-captured `console.log` activity in the
harvested `logs` payload is flaky — or deterministically fails when run alone
with `.only` — unless it pins the rate first. Before `browser.url(...)`:

```js
await browser.testHandle.scheduleReply('bamServer', {
  test: testRumRequest,
  body: JSON.stringify(rumFlags({ log: LOGGING_MODE.INFO, logapi: LOGGING_MODE.INFO }))
})
```

See `tests/specs/logging/harvesting.e2e.js` or `modes.e2e.js` for the full
pattern. If a log-related e2e test looks flaky, check this before assuming a
product regression.

## Types

`npm run test:types` builds `dist/types` and runs `tsd` against `tests/dts/**`.
Any public API change needs a matching `.d.ts` and, if applicable, a `tests/dts`
assertion.
