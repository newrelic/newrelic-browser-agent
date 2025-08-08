import { testBlobTraceRequest, testErrorsRequest, testEventsRequest, testInsRequest, testLogsRequest, testMetricsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { rumFlags } from '../../../tools/testing-server/constants'
import { LOGGING_MODE } from '../../../src/features/logging/constants'

describe('disable harvesting', () => {
  it('should disable harvesting metrics and errors when err entitlement is 0', async () => {
    const [metricsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMetricsRequest },
      { test: testErrorsRequest }
    ])
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ err: 0 }))
    })

    const [metricsHarvests, errorsHarvests] = await Promise.all([
      metricsCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(metricsHarvests).toEqual([])
    expect(errorsHarvests).toEqual([])
  })

  it('should disable harvesting spa when spa entitlement is 0', async () => {
    const eventsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testEventsRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ spa: 0 }))
    })

    // Disable non-spa features that also use the events endpoint
    const init = {
      ajax: { enabled: false },
      page_view_timing: { enabled: false }
    }
    const [eventsHarvests] = await Promise.all([
      eventsCapture.waitForResult(({ timeout: 10000 })),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html', { init }))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(eventsHarvests).toEqual([])
  })

  it('should disable harvesting page actions when ins entitlement is 0', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ ins: 0 }))
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult(({ timeout: 10000 })),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(insightsHarvests).toEqual([])
  })

  it('should disable harvesting console logs when log entitlement is 0', async () => {
    // logging mode will only take effect on a fresh session
    await browser.destroyAgentSession()

    const logsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testLogsRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ log: LOGGING_MODE.OFF, logapi: LOGGING_MODE.OFF }))
    })

    const [logsHarvests] = await Promise.all([
      logsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(logsHarvests).toEqual([])
  })

  it('should disable harvesting session traces when stn entitlement is 0', async () => {
    const traceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ st: 0 }))
    })

    const [traceHarvests] = await Promise.all([
      traceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(traceHarvests).toEqual([])
  })

  ;['app-id', 'license-key'].forEach(name => {
    ;['before', 'after'].forEach(loadState => {
      it(`should disable all harvesting and abort if ${name} is absent (${loadState})`, async () => {
        const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })

        const [rumHarvests] = await Promise.all([
          rumCapture.waitForResult({ timeout: 10000 }),
          browser.url(await browser.testHandle.assetURL(`no-${name}-${loadState}.html`))
        ])

        expect(rumHarvests.length).toEqual(0)

        const eeBacklog = await browser.execute(function () {
          return newrelic.ee.backlog
        })
        expect(eeBacklog).toEqual({})
      })
    })
  })
})
