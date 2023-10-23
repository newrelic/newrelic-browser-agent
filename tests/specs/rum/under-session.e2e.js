describe('RUM request', () => {
  describe('fh flag', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    it('is not included when session is disabled', async () => {
      const testURL = await browser.testHandle.assetURL('instrumented.html') // in test suite, the default is disabled

      let rumToBeCalled = browser.testHandle.expectRum()
      await browser.url(testURL).then(() => browser.waitForAgentLoad())
      let rum = await rumToBeCalled

      expect(rum.request.query.fsh).toBeUndefined()
    })

    it('is included and correctly set with session', async () => {
      const testURL = await browser.testHandle.assetURL('instrumented.html', { init: { privacy: { cookies_enabled: true } } })

      let rumToBeCalled = browser.testHandle.expectRum()
      await browser.url(testURL).then(() => browser.waitForAgentLoad())
      let rum = await rumToBeCalled

      expect(rum.request.query.fsh).toEqual('1') // for the first page load of a session

      rumToBeCalled = browser.testHandle.expectRum()
      await browser.refresh()
      rum = await rumToBeCalled

      expect(rum.request.query.fsh).toEqual('0') // for subsequent page loads of the same session
    })
  })
})
