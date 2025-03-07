import runTest from './run-test'

describe('mootools compatibility', () => {
  it('1.6.0-nocompat', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/mootools/1.6.0-nocompat.html',
      afterLoadCallback: async () => {
        /**
         * This starts the process of a JSONP request on the page
         */
        await browser.execute(function () { window.run() })

        /**
         * This ensures the JSONP request resolved correctly.
         */
        await browser.waitUntil(
          () => browser.execute(function () {
            return !!window.success
          }),
          {
            timeout: 10000,
            timeoutMsg: 'Request never resolved'
          }
        )
      }
    })
  })
})
