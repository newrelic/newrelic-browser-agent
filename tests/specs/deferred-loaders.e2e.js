import { checkAjax, checkJsErrors, checkMetrics, checkPVT, checkPageAction, checkRum, checkSessionTrace, checkSpa } from '../util/basic-checks'
import { notIE } from '../../tools/browser-matcher/common-matchers.mjs'

// readyState not supported in ie11
describe.withBrowsersMatching(notIE)('Deferred Loaders', () => {
  ['defer', 'async', 'injection'].forEach(script => {
    it(`should still report if loaded by ${script}`, async () => {
      await browser.url(await browser.testHandle.assetURL('all-events.html', { script })) // Setup expects before loading the page

      const [rum, pvt, ajax, jserrors, metrics, pa, st, spa] = await Promise.all([
        browser.testHandle.expectRum(),
        browser.testHandle.expectTimings(),
        browser.testHandle.expectAjaxEvents(),
        browser.testHandle.expectErrors(),
        browser.testHandle.expectMetrics(),
        browser.testHandle.expectIns(),
        browser.testHandle.expectResources(),
        browser.testHandle.expectInteractionEvents(),
        await browser.url(await browser.testHandle.assetURL('all-events.html', { script })) // Setup expects before loading the page
      ])

      checkRum(rum.request)
      checkPVT(pvt.request)
      checkAjax(ajax.request)
      checkJsErrors(jserrors.request)
      checkMetrics(metrics.request)
      checkPageAction(pa.request)
      checkSessionTrace(st.request)
      checkSpa(spa.request)
    })
  })
})
