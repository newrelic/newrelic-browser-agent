import { checkAjax, checkJsErrors, checkMetrics, checkPVT, checkPageAction, checkRum, checkSessionTrace, checkSpa } from '../util/basic-checks'
import { notIE } from '../../tools/browser-matcher/common-matchers.mjs'

// readyState not supported in ie11
describe.withBrowsersMatching(notIE)('Deferred Loaders', () => {
  ['defer', 'async', 'injection'].forEach(script => {
    it(`should still report if loaded by ${script}`, async () => {
      const [rum, pvt, ajax, jserrors, metrics, pa, st, spa] = await Promise.all([
        browser.testHandle.expectRum(), // /1
        browser.testHandle.expectTimings(), // /events
        browser.testHandle.expectAjaxEvents(), // /events
        browser.testHandle.expectErrors(), // /jserrors
        browser.testHandle.expectMetrics(), // /jserrors
        browser.testHandle.expectIns(), // /ins
        browser.testHandle.expectResources(), // /resources
        browser.testHandle.expectInteractionEvents(), // /events
        browser.url(await browser.testHandle.assetURL('all-events.html', { script }))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
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
