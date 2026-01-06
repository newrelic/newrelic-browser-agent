describe('behavior tests', () => {
  const config = { init: { soft_navigations: { enabled: true } } }

  ;['rum', 'full', 'spa'].forEach((loader) => {
    it(`using SPA api with ${loader} loader behaves as expected`, async () => {
      await browser.url(
        await browser.testHandle.assetURL('soft_navigations/spa-api-test.html', { ...config, loader })
      ).then(() => browser.waitForAgentLoad())

      await $('body').click()

      await browser.waitUntil(() => browser.execute(function () {
        return window.test.ran && window.test.expectedBehavior && window.test.expectedLog
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Conditions never passed'
      })
    })
  })
})
