import { reliableUnload } from '../../../tools/browser-matcher/common-matchers.mjs'
import runTest from './run-test'

describe.withBrowsersMatching(reliableUnload)('requirejs compatibility', () => {
  it('2.3.6', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/requirejs/2.3.6.html'
    })
  })
})
