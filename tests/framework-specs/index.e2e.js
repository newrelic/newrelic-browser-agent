import fs from 'fs'
import path from 'path'
import vm from 'vm'
import {
  testRumRequest,
  testTimingEventsRequest,
  testMetricsRequest,
  testBlobTraceRequest,
  testBlobReplayRequest,
  testAjaxEventsRequest,
  testErrorsRequest,
  testLogsRequest,
  testInsRequest,
  testInteractionEventsRequest
} from '../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../tools/testing-server/constants'
import { getBrowserName } from '../../tools/browsers-lists/utils.mjs'

const RESULTS_DIR = path.resolve(__dirname, '../../.framework-results')
const FRAMEWORKS_DIR = path.resolve(__dirname, '../../tools/test-builds/frameworks')

/*
 * Every folder under tools/test-builds/frameworks is a framework app covered by this suite. The
 * folder name is the framework's identity: it is the report label and, by default, the npm package
 * in the app's node_modules whose version is reported. Frameworks whose package name differs from
 * the folder name (e.g. @angular/core) can set `frameworkPackage` in the app's package.json.
 */
const ELECTRON = 'electron'
// `-b electron` (see tools/wdio/config/electron.conf.mjs) runs this suite locally against the packaged
// Electron app only; the regular LambdaTest browser run skips the electron app.
const IS_ELECTRON_RUN = getBrowserName(browser.requestedCapabilities) === 'electron'
const FRAMEWORKS = fs.readdirSync(FRAMEWORKS_DIR, { withFileTypes: true })
  .filter(dir => dir.isDirectory())
  .map(dir => dir.name)
  .filter(name => (name === ELECTRON) === IS_ELECTRON_RUN)

// The launch args the electron wdio config (tools/wdio/config/electron.conf.mjs) gave this session's app
const electronArg = (name) => browser.requestedCapabilities['goog:chromeOptions'].args
  .find(arg => arg.startsWith(`--${name}=`)).slice(name.length + 3)

const TEST_ERROR_MESSAGE = 'framework-spec-test-error'
const TEST_LOG_MESSAGE = 'framework-spec-test-log'
const TEST_ACTION_NAME = 'framework-spec-test-action'

// Every feature this suite checks, mapped to the network-capture predicate that proves a
// harvest request reached the collector, and (where the request could plausibly contain
// unrelated data) a `verify` step that confirms the harvest actually contains the event our
// own trigger produced, not some other error/log/action that happened to fire on the page.
// This is informational only - a `false` here means "this framework build didn't emit that
// feature's event", not a hard test failure.
// metrics only harvests at page end-of-life (preHarvestChecks requires opts.isFinalHarvest in
// src/features/metrics/aggregate/index.js), so it's checked separately below by navigating away
// to trigger the unload/final harvest, rather than alongside the checks that fire on page load.
const METRICS_CHECK = { name: 'metrics', test: testMetricsRequest }

const FEATURE_CHECKS = [
  { name: 'page_view_event', test: testRumRequest },
  { name: 'page_view_timing', test: testTimingEventsRequest },
  { name: 'session_trace', test: testBlobTraceRequest },
  { name: 'session_replay', test: testBlobReplayRequest },
  {
    name: 'soft_navigations',
    test: testInteractionEventsRequest,
    verify: harvests => harvests.some(h => h.request.body?.some?.(evt => evt.trigger === 'initialPageLoad'))
  },
  {
    name: 'ajax',
    test: testAjaxEventsRequest,
    verify: (harvests, { url }) => harvests.some(h => h.request.body?.some?.(evt => evt.type === 'ajax' && url.includes(evt.path)))
  },
  {
    name: 'jserrors',
    test: testErrorsRequest,
    verify: harvests => harvests.some(h => h.request.body?.err?.some(e => e.params?.message === TEST_ERROR_MESSAGE))
  },
  {
    name: 'logging',
    test: testLogsRequest,
    // the logs harvest body is a JSON-encoded string, not a parsed array: "[{\"common\":...,\"logs\":[...]}]"
    verify: harvests => harvests.some(h => JSON.parse(h.request.body).some(payload => payload.logs?.some(l => l.message === TEST_LOG_MESSAGE)))
  },
  {
    name: 'generic_events',
    test: testInsRequest,
    verify: harvests => harvests.some(h => h.request.body?.ins?.some(evt => evt.actionName === TEST_ACTION_NAME))
  }
]

for (const framework of FRAMEWORKS) {
  describe(`${framework} informational feature coverage`, () => {
    it('records which agent features report data for this framework build', async () => {
      // Each electron session runs the packaged app in one security mode (loose/strict) and gets its own report row
      const label = IS_ELECTRON_RUN ? `${framework}-${electronArg('nr-mode')}` : framework
      const captures = await browser.testHandle.createNetworkCaptures('bamServer', FEATURE_CHECKS.map(({ test }) => ({ test })))
      const [metricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [{ test: METRICS_CHECK.test }])

      // Logging verbosity and session replay's sampling mode are decided server-side via RUM
      // response flags (`log`/`logapi` and `sr`/`srs`) - the default log level cycles 1-5 per RUM
      // call, which can land below our INFO-level test log, and init.session_replay.sampling_rate
      // is deprecated/ineffective client-side config for the sampling decision. Force both so this
      // test is deterministic.
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        body: JSON.stringify(rumFlags({ sr: 1, srs: 1, log: 5, logapi: 5 }))
      })

      // The app fires its ajax/error/log/page-action triggers from a mount effect (not a click)
      // deliberately - soft navigations attributes anything fired inside a click handler to that
      // click's candidate interaction and holds it (via `handle('jserror', ...)`, see
      // src/features/jserrors/aggregate/index.js) until that interaction resolves, which made this
      // test flaky/stuck when the trigger lived behind a button. Firing on mount rides along with
      // the already-fast "initial page load" interaction instead.
      // Session replay also defaults to disabled.
      const initOverrides = { session_replay: { enabled: true } }
      let url
      if (IS_ELECTRON_RUN) {
        /*
         * The packaged Electron app loads its own renderer from disk, so there is no asset server page to
         * navigate to. Instead take the NREUM info/init the testing server would have injected into a page,
         * hand them to the app through its bootstrap file and reload the window so the agent starts fresh.
         * The same page doubles as the (CORS-enabled, http) target of the app's ajax trigger.
         */
        url = await browser.testHandle.assetURL('instrumented.html', { init: initOverrides })
        const html = await (await fetch(url)).text()
        const sandbox = {}
        sandbox.window = sandbox
        for (const [, script] of html.matchAll(/<script[^>]*>([^<]*NREUM\.(?:info|init)=[^<]*)<\/script>/g)) {
          vm.runInNewContext(script, sandbox)
        }
        fs.writeFileSync(electronArg('nr-bootstrap-file'), JSON.stringify({
          info: sandbox.NREUM.info,
          init: sandbox.NREUM.init,
          fetchUrl: url
        }))
        await browser.refresh()
      } else {
        url = await browser.testHandle.assetURL(`test-builds/frameworks/${framework}/index.html`, {
          init: initOverrides
        })
        await browser.url(url)
      }

      const results = {}
      await Promise.all(FEATURE_CHECKS.map(async ({ name, verify }, i) => {
        const harvests = await captures[i].waitForResult({ totalCount: 1, timeout: 20000 })
        results[name] = harvests.length > 0 && (!verify || verify(harvests, { url }))
      }))

      // Navigating away triggers the unload/final harvest metrics only sends on.
      const [metricsHarvests] = await Promise.all([
        metricsCapture.waitForResult({ timeout: 5000 }),
        browser.url(await browser.testHandle.assetURL('/'))
      ])
      results[METRICS_CHECK.name] = metricsHarvests.length > 0

      const appPkg = JSON.parse(fs.readFileSync(path.join(FRAMEWORKS_DIR, framework, 'package.json'), 'utf-8'))
      const frameworkPkg = JSON.parse(fs.readFileSync(
        path.join(FRAMEWORKS_DIR, framework, 'node_modules', appPkg.frameworkPackage || framework, 'package.json'),
        'utf-8'
      ))
      const agentPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'))

      // chromedriver reports an Electron app as chrome + its Chromium version; report the Electron
      // version instead so the electron row is identifiable in the "Tested on" summary.
      const electronVersion = IS_ELECTRON_RUN
        ? (await browser.execute(() => navigator.userAgent)).match(/Electron\/([\d.]+)/)?.[1]
        : undefined

      fs.mkdirSync(RESULTS_DIR, { recursive: true })
      fs.writeFileSync(
        path.join(RESULTS_DIR, `${label.replace(/[^\w.-]/g, '_')}.json`),
        JSON.stringify({
          framework: label,
          version: frameworkPkg.version,
          agentVersion: agentPkg.version,
          browser: electronVersion ? 'electron' : browser.capabilities.browserName,
          browserVersion: electronVersion || browser.capabilities.browserVersion,
          results
        }, null, 2)
      )

      // eslint-disable-next-line no-console
      console.log(`[framework-specs] ${label}@${frameworkPkg.version} feature results:`, results)
    })
  })
}
