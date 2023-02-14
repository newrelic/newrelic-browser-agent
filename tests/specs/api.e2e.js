describe('API', () => {
  let router

  beforeEach(async () => {
    router = await browser.getRouter()
  })

  afterEach(async () => {
    await router.disconnect()
  })

  it('customTransactionName 1 arg', async () => {
    const url = await router.getAssetUrl('api.html', {
      init: {
        page_view_timing: {
          enabled: false
        }
      }
    })

    console.log(url)
  })
})
