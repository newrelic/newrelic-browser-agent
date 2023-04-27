/**
 * This is a WDIO worker plugin that provides custom commands.
 */
export default class JilCommands {
  async before (capabilities, context, browser) {
    console.log(global.it)
    browser.addCommand('waitForFeature', async function (feature) {
      const command = `window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures['${feature}']`
      await browser.waitUntil(
        // () => browser.execute((feat) => `window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures['${feat}']`, feature),
        () => browser.execute(function (feat) {
          return window.NREUM && window.NREUM.activatedFeatures && window.NREUM.activatedFeatures[feat]
        }, feature),
        {
          timeout: 60000,
          timeoutMsg: 'Agent never loaded'
        })
    })
  }
}
