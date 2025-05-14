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

    const seenMessages = {
      'window load addEventListener': false,
      'document readystatechange addEventListener': false,
      'document DOMContentLoaded addEventListener': false,
      setTimeout: false,
      setInterval: false,
      requestAnimationFrame: false,
      'xhr load addEventListener': false,
      'Unhandled Promise Rejection: fetch network error': false,
      'Unhandled Promise Rejection: fetch response error': false
    }

    errors[0].request.body.err.forEach((error) => {
      const message = error.params.message
      expect(seenMessages[message]).toBeDefined()
      if (seenMessages[message] !== undefined) {
        seenMessages[message] = true
      }
    })
    expect(Object.values(seenMessages).every((seen) => seen)).toBe(true)
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
