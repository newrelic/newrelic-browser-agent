describe('ins harvesting', () => {
  it('NEWRELIC-9370: should not throw an exception when calling addPageAction with window.location before navigating', async () => {
    const testUrl = await browser.testHandle.assetURL('api/addPageAction-unload.html')
    await browser.url(testUrl)
      .then(() => browser.waitForAgentLoad())

    const [pageActionsHarvest] = await Promise.all([
      browser.testHandle.expectIns(),
      browser.testHandle.expectErrors(10000, true),
      browser.execute(function () {
        window.triggerPageActionNavigation()
      })
    ])

    expect((await pageActionsHarvest).request.body.ins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actionName: 'pageaction',
        href: testUrl
      })
    ]))
  })
})
