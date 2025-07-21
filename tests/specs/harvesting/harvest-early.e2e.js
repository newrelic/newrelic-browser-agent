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
    const [ajaxResults, insResults, ixnResults, loggingResults] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      insightsCapture.waitForResult({ timeout: 10000 }),
      interactionEventsCapture.waitForResult({ timeout: 10000 }),
      loggingEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('harvest-early.html'))
        .then(() => browser.waitForAgentLoad())
        .catch(err => {
          console.error('Error loading asset:', err)
          throw err
        })
    ])

    expect(ajaxResults.length && insResults.length && ixnResults.length && loggingResults.length).toBeTruthy()
  })
})
