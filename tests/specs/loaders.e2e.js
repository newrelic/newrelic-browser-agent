import { checkAjaxEvents, checkJsErrors, checkMetrics, checkPVT, checkPageAction, checkRumBody, checkRumQuery, checkSessionTrace, checkSpa } from '../util/basic-checks'

const scriptLoadTypes = [null, 'defer', 'async', 'injection']

describe('Loaders', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  scriptLoadTypes.forEach(scriptLoadType => {
    it(`should report data for the lite agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'rum', script: scriptLoadType })
      const [rum, pvt, metrics] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectMetrics(),
        browser.testHandle.expectAjaxEvents(10000, true),
        browser.testHandle.expectErrors(10000, true),
        browser.testHandle.expectIns(10000, true),
        browser.testHandle.expectTrace(10000, true),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      checkRumQuery(rum.request, { liteAgent: true })
      checkRumBody(rum.request, { liteAgent: true })
      checkPVT(pvt.request)
      checkMetrics(metrics.request)
    })

    it(`should report data for the pro agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'full', script: scriptLoadType })
      const [rum, pvt, metrics, ajax, jserrors, pa, st] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectMetrics(),
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.testHandle.expectIns(),
        browser.testHandle.expectTrace(),
        browser.testHandle.expectInteractionEvents(10000, true),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      checkRumQuery(rum.request)
      checkRumBody(rum.request)
      checkPVT(pvt.request)
      checkMetrics(metrics.request)
      checkAjaxEvents(ajax.request)
      checkJsErrors(jserrors.request)
      checkPageAction(pa.request)
      checkSessionTrace(st.request)
    })

    it(`should report data for the spa agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'spa', script: scriptLoadType })
      const [rum, pvt, metrics, ajax, jserrors, pa, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectMetrics(),
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.testHandle.expectIns(),
        browser.testHandle.expectTrace(10000),
        browser.testHandle.expectInteractionEvents(),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      checkRumQuery(rum.request)
      checkRumBody(rum.request)
      checkPVT(pvt.request)
      checkMetrics(metrics.request)
      checkAjaxEvents(ajax.request)
      checkJsErrors(jserrors.request)
      checkPageAction(pa.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)
    })
  })
})
