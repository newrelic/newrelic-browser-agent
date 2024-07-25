import { testBlobTraceRequest, testErrorsRequest, testEventsRequest, testInsRequest, testMetricsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('disable harvesting', () => {
  it('should disable harvesting metrics and errors when err entitlement is 0', async () => {
    const [metricsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMetricsRequest },
      { test: testErrorsRequest }
    ])
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        st: 1,
        err: 0,
        ins: 1,
        spa: 1,
        loaded: 1
      })
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
      body: JSON.stringify({
        st: 1,
        err: 1,
        ins: 1,
        spa: 0,
        loaded: 1
      })
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
      body: JSON.stringify({
        st: 1,
        err: 1,
        ins: 0,
        spa: 1,
        loaded: 1
      })
    })

    const [insightsHarvests] = await Promise.all([
      insightsCapture.waitForResult(({ timeout: 10000 })),
      browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(insightsHarvests).toEqual([])
  })

  it('should disable harvesting session traces when stn entitlement is 0', async () => {
    const traceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        st: 0,
        err: 1,
        ins: 1,
        spa: 1,
        loaded: 1
      })
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
        const rumPromise = browser.testHandle.expectRum(10000, true)

        await browser.url(await browser.testHandle.assetURL(`no-${name}-${loadState}.html`))

        await expect(rumPromise).resolves.toEqual(undefined)

        const eeBacklog = await browser.execute(function () {
          return newrelic.ee.backlog
        })
        expect(eeBacklog).toEqual({})
      })
    })
  })
})
