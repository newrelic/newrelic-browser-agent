# Testing the "before-send-hook" experimental build

This is a quick guide for trying out an experimental build of the New
Relic browser agent, published from a development branch. No prior
experience with the browser agent is required.

## What's an "experimental build"?

Every branch of the browser agent can be built and published to a
temporary URL for testing, before it's ever released to customers.
This lets you try out in-progress changes on a real web page without
waiting for a release.

This particular build is hosted at:

```
https://js-agent.newrelic.com/experiments/dev/before-send-hook/nr-loader-spa.min.js
```

That URL is already wired up in the provided template file,
[`experimental-build-test.html`](experimental-build-test.html) — you
shouldn't need to touch it unless you want to point the page at a
*different* experimental branch later (just swap the branch name in
the URL).

## What's in the template

Open `experimental-build-test.html` in a text editor. It has three parts:

1. **Configuration (`NREUM.info` / `NREUM.loader_config`)** — this
   tells the agent which New Relic account/app to report to. If you
   have a real "Copy/Paste JavaScript" snippet from a New Relic
   browser app (found under *New Relic > Browser > your app >
   Application settings*), copy those three values in. If you don't
   have one, or you don't care about real data showing up anywhere,
   the placeholder values are fine to leave as-is — see "Observation
   mode" below for why.

2. **Observation mode (`NREUM.init.observation_mode.enabled = true`)**
   — this is already turned **on** in the template. In this mode the
   agent behaves completely normally internally — it collects data,
   builds the payloads it would normally send — but it **never
   actually sends anything over the network.** This is the safe
   default for trying out an experimental build: you can't
   accidentally pollute a real account's data, and you don't need
   valid account credentials just to see the agent run.

   When you're ready to actually send data to a real account (for
   example, to verify server-side processing), change this to:
   ```js
   observation_mode: { enabled: false }
   ```

3. **The `beforeHarvest` hook** — this is a callback the agent calls
   right before it would send each batch of data ("a harvest"). The
   template registers one that just logs the payload to the console,
   so you can see exactly what the agent collected.

   Your callback is called with a single object argument:
   `{ feature, payload }`.
   - `feature` tells you which part of the agent this harvest came
     from — e.g. `"jserrors"` (errors), `"generic_events"` (page
     actions and similar events), `"session_replay"`, `"ajax"`,
     `"page_view_timing"`, `"session_trace"`, `"metrics"`,
     `"logging"`, or `"soft_navigations"`. Use this to decide how (or
     whether) to act on a given harvest — for example, only inspecting
     error payloads and leaving everything else alone.
   - `payload` is the actual data that's about to be sent.

   What you *return* from the callback only concerns `payload` itself
   (not the `{ feature, payload }` wrapper):
   - Return the payload unchanged (or modified) to send it as-is/edited.
   - Return `null` to block that particular harvest from sending.
   - Return nothing to send the original payload untouched.

   This is useful for experimenting with your own data-filtering or
   enrichment logic before it ships.

## How to run it

1. Save/open `experimental-build-test.html` anywhere on your machine.
2. Double-click it to open it in a browser (or serve it with any
   local static file server — a `file://` URL works fine for this).
3. Open your browser's DevTools (F12 or right-click → Inspect), and
   switch to the **Console** tab.
4. Reload the page.
5. In the console, you should see one `[beforeHarvest] feature: ...
   payload: {...}` log line per harvest cycle (roughly every 10-30
   seconds, plus one shortly after page load) — one per feature that
   had data to send. Expand those objects to see exactly what the
   agent collected (page views, AJAX calls, errors, etc., depending on
   what you did on the page), and note the `feature` name so you know
   which part of the agent it came from.
6. Switch to the **Network** tab and filter for `nr-data.net`. While
   observation mode is on, you should see **no** requests going out —
   confirming nothing is actually being sent anywhere.

## Going further

- **Trigger specific data**: click around the page, open the console
  and run `console.error('test error')`, or trigger an XHR/fetch
  request — then watch for the corresponding entries in the next
  `beforeHarvest` log.
- **Turn off observation mode**: once you're satisfied with what
  you're seeing and want to confirm data actually lands in a real New
  Relic account, set `observation_mode.enabled` to `false` and fill in
  real credentials in `NREUM.info` / `NREUM.loader_config`.
- **Test a different branch**: change the script `src` URL at the
  bottom of the file to point at a different branch name under
  `https://js-agent.newrelic.com/experiments/dev/{branch-name}/nr-loader-spa.min.js`.

## Troubleshooting

- **Nothing logs to the console at all**: check the Network tab to
  confirm the loader script itself (`nr-loader-spa.min.js`) loaded
  successfully (status 200, not 404). A 404 usually means the branch
  name in the URL doesn't match a currently published experimental
  build.
- **Console errors about `newrelic` not being defined**: this usually
  resolves itself — the `beforeHarvest` registration in the template
  polls briefly until the agent is ready. If it persists, check that
  the loader `<script>` tag isn't being blocked (e.g. by an ad
  blocker or Content Security Policy).
