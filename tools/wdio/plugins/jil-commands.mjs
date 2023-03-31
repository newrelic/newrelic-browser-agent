/**
 * This is a WDIO worker plugin that provides custom commands.
 */
export default class TestingServerWorker {
  async before (capabilities, context, browser) {
    browser.addCommand('waitForFeature', async function (feature) {
      await browser.waitUntil(
        () => browser.execute((feat) => `window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures['${feat}']`, feature),
        {
          timeout: 60000,
          timeoutMsg: 'Agent never loaded'
        })
    })
  }
}
