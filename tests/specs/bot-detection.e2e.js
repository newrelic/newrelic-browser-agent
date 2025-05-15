import { testRumRequest } from '../../tools/testing-server/utils/expect-tests'

describe('Bot detection', () => {
  let rumCapture
  beforeEach(async () => {
    [rumCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest }
    ])
  })

  it('should detect bot user', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))

    const rumCall = await rumCapture.waitForResult({ totalCount: 1 })
    expect(rumCall[0].request.body.ja).toEqual(
      expect.objectContaining({
        bot: true,
        botHints: 'webdriver',
        userAgent: expect.any(String)
      })
    )
  })
})
