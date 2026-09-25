import fs from 'fs'
import path from 'path'
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
} from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'

const FRAMEWORK = 'react'
const APP_DIR = 'vite-react-wrapper'
const RESULTS_DIR = path.resolve(__dirname, '../../../.framework-results')

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

describe('react (vite-react-wrapper) informational feature coverage', () => {
  it('records which agent features report data for this framework build', async () => {
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
    const url = await browser.testHandle.assetURL(`test-builds/${APP_DIR}/index.html`, {
      init: { session_replay: { enabled: true } }
    })
    await browser.url(url)

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

    const reactPkg = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, '../../../tools/test-builds', APP_DIR, 'node_modules/react/package.json'),
      'utf-8'
    ))
    const agentPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf-8'))

    fs.mkdirSync(RESULTS_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(RESULTS_DIR, `${FRAMEWORK}.json`),
      JSON.stringify({
        framework: FRAMEWORK,
        version: reactPkg.version,
        agentVersion: agentPkg.version,
        browser: browser.capabilities.browserName,
        browserVersion: browser.capabilities.browserVersion,
        results
      }, null, 2)
    )

    // eslint-disable-next-line no-console
    console.log(`[framework-specs] ${FRAMEWORK}@${reactPkg.version} feature results:`, results)
  })
})
