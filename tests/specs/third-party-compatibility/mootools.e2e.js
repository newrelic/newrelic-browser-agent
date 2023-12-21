import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import runTest from './run-test'

// IE does not have reliable unload support
describe.withBrowsersMatching(notIE)('mootools compatibility', () => {
  it('1.6.0-nocompat', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/mootools/1.6.0-nocompat.html',
      afterLoadCallback: async () => {
        await browser.execute(function () { window.run() })
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
