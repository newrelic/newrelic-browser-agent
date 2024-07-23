import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testAjaxEventsRequest, testAjaxTimeSlicesRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Basic AJAX Tests', () => {
  it.withBrowsersMatching(supportsFetch)('should not delay page load for harvesting', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testAjaxEventsRequest,
      delay: 20000,
      permanent: true
    })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testAjaxTimeSlicesRequest,
      delay: 20000,
      permanent: true
    })

    await browser.url(await browser.testHandle.assetURL('ajax/xhr-simple.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        window.disableAjaxHashChange = true
      }))

    await $('#sendAjax').click()
    await browser.pause(5000)

    const start = performance.now()
    await browser.url(await browser.testHandle.assetURL('ajax/fetch-simple.html'))
      .then(() => browser.waitForAgentLoad())
    const end = performance.now()

    expect(end - start).toBeWithin(0, 5000)
  })
})
