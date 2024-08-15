import { notIOS, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'
import runTest from './run-test'
import { testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

// iOS Appium hates the use of canvas
// As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
describe.withBrowsersMatching([notIOS, notSafari])('jspdf compatibility', () => {
  it('2.5.1', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/jspdf/2.5.1.html',
      afterLoadCallback: async () => {
        const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
        const [errorsResults] = await Promise.all([
          errorsCapture.waitForResult({ timeout: 10000 }),
          $('body').click() // Setup expects before interacting with page
        ])
        expect(errorsResults.length).toEqual(0)

        const pdfGenerated = await browser.execute(function () {
          return !!pdfGenerated
        })
        expect(pdfGenerated).toEqual(true)
      }
    })
  })
})
