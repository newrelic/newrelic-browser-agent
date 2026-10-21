# Supportability metric tests

Every supportability metric (SM) in `tools/supportability-metrics/registry.js` gets one generated jest test, in
[coverage.test.js](coverage.test.js), that proves the metric is **actually reported** by the real agent code. You do not write the test
itself. You write a small **trigger**: the code that makes the agent report the metric. The generated test runs it and checks that the
metric showed up.

Run everything with `npm run supportability-metrics:test` (about 3 seconds).

## You were sent here because a new metric is "pending"

When you add a new SM and commit, the pre-commit hook adds a stub for it to the registry and lists it in [pending.js](pending.js). That
message means:

- **Your commit is not blocked by the missing test.** `pending.js` only warns. (The commit is blocked until you write the stub's
  description. That part is separate; see the registry entry the message points to.)
- **But the metric is unproven.** Until a trigger passes, nothing checks that the metric is reported. If someone later changes the code
  path, renames the metric, or breaks the condition that fires it, nothing fails. It just silently stops showing up in Angler and on the
  dashboards, and nobody notices until someone wonders why a chart went flat.
- **Pending is meant to shrink.** Each line in `pending.js` is a metric with no safety net. Leaving it there is allowed, but it is debt.

So: write the trigger now if you can (usually 5 to 20 lines), then delete the line from `pending.js`.

## How to add a test for a metric

1. **Find the registry entry** for your metric in `tools/supportability-metrics/registry.js` and note its `tag`. For a family with a
   placeholder, use the entry's tag as written, for example `API/<name>/called`.
2. **Pick the trigger file** in [triggers/](triggers/) that matches the feature, and add a key with the entry's `tag`. If none fits, add a
   new file and require it in [triggers/index.js](triggers/index.js).

   | File | What goes there |
   | --- | --- |
   | `mechanical.js` | Metrics that follow from a value: API names, loader and distribution types, frameworks, flags, config paths, internal error reasons, and the simple checks the metrics feature runs at load |
   | `ajax-session.js` | Ajax exclusions and payload bytes, session race condition |
   | `generic.js` | User actions, resource timing, web sockets, time keeper |
   | `session-replay.js` | Session replay aborts, inline CSS, rrweb bytes |
   | `harvest.js` | Event buffer drops, early harvests, the audit metrics |
   | `network.js` | Harvester retries, browser connect response errors |

3. **Write the trigger** (shapes below). It must drive the **real production code path** that reports the metric. Do not call the
   reporting function yourself with the name: that would prove nothing.
4. **Run just that test:**
   `npm run supportability-metrics:test -- -t "Your/Metric/Name"`
5. **Run the whole file** (`npm run supportability-metrics:test`). The agent is shared across all triggers, so a trigger that passes alone
   can still break another, or fail when run after another. See "Shared state" below.
6. **Delete the metric's line from [pending.js](pending.js).** If you forget, the test fails with `(pending: remove it from pending.js once
   this passes)`, which tells you to do exactly that.

## Trigger shapes

A trigger is keyed by the registry entry's `tag`. The generated test calls it and then expects the metric name to have been reported.

**A single metric:** a function. The first argument is unused.

```js
'Generic/WebDriver/Detected': async (_, ctx) => {
  Object.defineProperty(window.navigator, 'webdriver', { value: true, configurable: true })
  try { await singleChecks(ctx) } finally { delete window.navigator.webdriver }
},
```

**A family with `values` in the registry:** the same function form. It is called once per value, with the value as the first argument.

```js
'Framework/<name>/Detected': async (name, ctx) => {
  const undo = FRAMEWORK_FIXTURES[name]()
  try { await singleChecks(ctx) } finally { undo() }
},
```

**An open-ended family with no `values`** (for example `Feature_Flag/<flag>/Seen`): give `samples`. Each sample replaces the placeholder,
and becomes its own generated test.

```js
'Feature_Flag/<flag>/Seen': {
  samples: ['rum_v2', 'register', 'websockets'],
  run: (flag, ctx) => withSetting(ctx.agent, 'init/feature_flags', [flag], () => singleChecks(ctx))
},
```

**Several placeholders, or names that are not one placeholder filled in:** give `tags`, the exact metric names to assert. `run` receives
each one.

```js
'Config/<init path>/Changed': {
  tags: ['Config/harvest/interval/Changed', 'Config/proxy/assets/Changed'],
  run: (tag, ctx) => withSetting(ctx.agent.init, tag.replace(/^Config\//, '').replace(/\/Changed$/, ''), 12345, () => singleChecks(ctx))
},
```

## What `ctx` gives you

| Helper | Use |
| --- | --- |
| `ctx.agent` | The one shared agent for the whole file |
| `await ctx.feature(Instrument)` | Initializes a feature once and returns its aggregate. Import the feature's `Instrument` class |
| `ctx.forceDrain(aggregate)` | Drains a feature's buffered events now. A normal drain waits for every registered feature, which this shared agent never reaches |
| `await ctx.settle()` | Waits about 25 ms for work the agent defers with a timer |

Prefer `jest.spyOn` inside the trigger over module-level `jest.mock`, since the whole file is shared. `jest.restoreAllMocks()` runs after
every test.

## Shared state (the most common way a trigger breaks)

All triggers share **one agent**. A trigger that changes something and does not put it back will make a later trigger fail for a reason
that looks unrelated.

- Restore everything you change, in a `finally`. The `withSetting` helper in `triggers/mechanical.js` sets a value by path and restores it.
- Features that abort stay aborted, and each new aggregate registers handlers on the shared emitter. If you create your own aggregate,
  disable or clean it up afterwards (see `triggers/session-replay.js`).
- Drains are coordinated across features, so use `ctx.forceDrain`, not the aggregate's own `drain()`.
- If your trigger passes alone but fails in the full run, or the reverse, this is the cause. Bisect by running it with `-t` together with
  one earlier family at a time.

## When you cannot write a trigger

Sometimes the metric cannot be triggered because the production code never reports it (this has happened: a documented metric that nothing
emits). Do not fake it. Keep the metric in `pending.js` and put a comment above the line saying **why**, so the next person does not have
to rediscover it. If it is a real bug, fix the code or remove the metric from the registry. The six entries currently in `pending.js` are
examples.

A pending metric that has a trigger is reported as an expected failure, and the run prints a count:
`Supportability metrics without a generated test: N of M`.

## If you are Claude working on this

The user asked you to add a test for a new supportability metric that is listed in `pending.js`. Do this:

1. Read this file, `harness.js`, `coverage.test.js`, and the trigger file that fits the feature. `triggers/mechanical.js` has a working
   example of every trigger shape and of restoring shared state.
2. Find where the metric is reported in `src/` and what has to be true for it to fire. Read the existing component tests for that feature
   (under `tests/components/`) to see how its code path is driven and mocked, and reuse those patterns.
3. Add the trigger to the matching file in `triggers/`, keyed by the registry entry's `tag`. Keep the file syntactically valid at every
   save. Edit only the trigger file, and `pending.js` once it passes. Do not change `src/`, the registry, `coverage.test.js`, or
   `harness.js` to make a test pass. If the production code has a bug, stop and report it instead.
4. Run `npm run supportability-metrics:test -- -t "<metric>"`, then the whole file, then `npx eslint tests/components/supportability-metrics`.
5. Remove the metric's line from `pending.js`.
6. If you cannot make it pass, leave it in `pending.js` with a comment explaining why, and tell the user what blocked you (and whether you
   suspect a production bug).

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `No trigger for "..."` | The metric has no trigger and is not in `pending.js`. Add a trigger, or list it in `pending.js` |
| `(pending: remove it from pending.js once this passes)` fails | The trigger now works. Delete the line from `pending.js` |
| `Expected: ArrayContaining ["..."]  Received: []` | The scenario ran but the metric was never reported. The condition that fires it is not met, the feature is not drained, or it is reported after a timer (try `await ctx.settle()`) |
| Passes alone, fails in the full run | Shared state. Restore what you changed, or an earlier trigger left the agent in a bad state |
| `TypeError: ... is not a function` on the agent | The API or feature is not set up yet. Initialize it with `ctx.feature(...)` or the matching `setup*API` |
