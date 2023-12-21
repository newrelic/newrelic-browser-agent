import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import runTest from './run-test'

// IE does not have reliable unload support
describe.withBrowsersMatching(notIE)('requirejs compatibility', () => {
  it('2.3.6', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/requirejs/2.3.6.html'
    })
  })
})
