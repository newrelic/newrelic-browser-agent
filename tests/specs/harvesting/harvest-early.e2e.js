import { testAjaxEventsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('should harvest early', () => {
  let ajaxEventsCapture
  let insightsCapture
  let interactionEventsCapture
  let loggingEventsCapture

  beforeEach(async () => {
    [ajaxEventsCapture, insightsCapture, interactionEventsCapture, loggingEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testInsRequest },
      { test: testInteractionEventsRequest },
      { test: testLogsRequest }
    ])
  })

  it('should harvest early when exceeding ideal size', async () => {
    const timeStart = Date.now()
    await browser.url(await browser.testHandle.assetURL('harvest-early-block-internal.html'))

    await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      loggingEventsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        document.querySelector('body').click()
      })
    ])

    expect(Date.now() - timeStart).toBeLessThan(30000) // should have harvested early before 30 seconds
  })

  /** if we track internal and spawn early requests, we can potentially create a feedback loop that goes on forever with large ajax requests describing themselves */
  it('should not harvest AJAX early when agent is tracking internal calls', async () => {
    await browser.url(await browser.testHandle.assetURL('harvest-early.html'))

    const [ajaxResults] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.querySelector('body').click()
      })
    ])

    expect(ajaxResults.length).toBeFalsy()
  })
})
