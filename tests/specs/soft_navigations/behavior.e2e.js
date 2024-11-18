describe('behavior tests', () => {
  it('using SPA apis with lite loader does not throw errors', async () => {
    await browser.url(
      await browser.testHandle.assetURL('soft_navigations/spa-api-test.html', { loader: 'rum' })
    ).then(() => browser.waitForAgentLoad())

    await $('body').click()

    await browser.waitUntil(() => browser.execute(function () {
      return window.test.ran && window.test.passed
    }),
    {
      timeout: 10000,
      timeoutMsg: 'Conditions never passed'
    })
  })
})
