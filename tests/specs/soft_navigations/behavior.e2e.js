describe('behavior tests', () => {
  ;['rum', 'full', 'spa'].forEach((loader) => {
    ;[{ feature_flags: ['soft_nav'] }, undefined].forEach((init) => {
      it(`using SPA api with ${loader} loader & soft nav: ${!!init} behaves as expected`, async () => {
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/spa-api-test.html', { loader, init })
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
})
