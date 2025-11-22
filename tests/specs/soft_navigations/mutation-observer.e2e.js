import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('MutationObserver', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('should not throw an error when a UI event is triggered before the body exists', async () => {
    await browser.url(await browser.testHandle.assetURL('mutation-observer-test.html'))
      .then(() => browser.waitForAgentLoad())
    const errorResult = await errorsCapture.waitForResult({ timeout: 10000 })
    expect(errorResult.length).toBe(0)
  })
})
