import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('basic error capturing', () => {
  it('should capture errors at various page lifecycle stages and events', async () => {
    const [errors] = await Promise.all([
      browser.testHandle.expectErrors(),
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
    if (browserMatch(notIE)) {
      expected.push(...[
        expect.objectContaining({
          params: expect.objectContaining({ message: 'Unhandled Promise Rejection: fetch network error' })
        }),
        expect.objectContaining({
          params: expect.objectContaining({ message: 'Unhandled Promise Rejection: fetch response error' })
        })
      ])
    }

    expect(errors.request.body.err.length).toEqual(expected.length)
    expect(errors.request.body.err).toEqual(expect.arrayContaining(expected))
  })
})
