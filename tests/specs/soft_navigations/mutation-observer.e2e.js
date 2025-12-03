import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('MutationObserver', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('should not throw an error when a UI event is triggered before the body exists', async () => {
    const loaderType = await browser.url(await browser.testHandle.assetURL('mutation-observer-test.html', { loader: 'spa' }))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.execute(function () {
        return Object.values(NREUM.initializedAgents)[0].runtime.loaderType
      }))
    expect(loaderType).toBe('spa')
    const errorResult = await errorsCapture.waitForResult({ timeout: 10000 })
    expect(errorResult.length).toBe(0)
  })
})
