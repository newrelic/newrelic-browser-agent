import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('basic error capturing', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('should capture errors at various page lifecycle stages and events', async () => {
    const [errors] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-error-page-lifecycle.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const expected = [
      expect.objectContaining({
        params: expect.objectContaining({ message: 'window load addEventListener' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'document readystatechange addEventListener' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'document DOMContentLoaded addEventListener' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'setTimeout' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'setInterval' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'requestAnimationFrame' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'xhr load addEventListener' })
      })
    ]

    expected.push(...[
      expect.objectContaining({
        params: expect.objectContaining({ message: 'Unhandled Promise Rejection: fetch network error' })
      }),
      expect.objectContaining({
        params: expect.objectContaining({ message: 'Unhandled Promise Rejection: fetch response error' })
      })
    ])

    expect(errors[0].request.body.err.length).toEqual(expected.length)
    expect(errors[0].request.body.err).toEqual(expect.arrayContaining(expected))
  })

  it('should capture file and line number for syntax errors', async () => {
    const [errors] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('js-error-syntax-error.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(errors[0].request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          stackHash: 334471736,
          exceptionClass: 'SyntaxError',
          stack_trace: expect.stringContaining('<inline>:18')
        })
      }),
      expect.objectContaining({
        params: expect.objectContaining({
          stackHash: 334471761,
          exceptionClass: 'SyntaxError',
          stack_trace: expect.stringContaining('<inline>:22')
        })
      })
    ]))
  })
})
