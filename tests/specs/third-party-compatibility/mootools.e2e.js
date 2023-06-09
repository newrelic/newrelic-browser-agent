import { reliableUnload } from '../../../tools/browser-matcher/common-matchers.mjs'
import runTest from './run-test'

describe('mootools compatibility', () => {
  withBrowsersMatching(reliableUnload)('1.6.0-nocompat', async () => {
    await runTest({
      browser,
      testAsset: 'third-party-compatibility/mootools/1.6.0-nocompat.html',
      afterLoadCallback: async () => {
        await browser.testHandle.expectEvents() // Wait for the next harvest to continue the test

        const [eventsResults] = await Promise.all([
          browser.testHandle.expectInteractionEvents(),
          browser.execute(function () { document.querySelector('body').click() }) // Setup expects before interacting with page
        ])

        const jsonpRequest = eventsResults.request.body
          .find(interaction =>
            Array.isArray(interaction.children) && interaction.children.findIndex(childNode =>
              childNode.type === 'ajax' && childNode.path === '/jsonp'
            ) > -1
          )
        expect(jsonpRequest).toBeDefined()
        expect(Array.isArray(jsonpRequest.children)).toEqual(true)
      }
    })
  })
})
