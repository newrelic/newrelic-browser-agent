describe('Rum Call Metadata -', () => {
  it('Agent stores and uses rum call app id', async () => {
    const [{ request: { query: { a: loadTimeAppId } }, reply: { body: rumResponseBody } }, { request: { query: timingsQuery } }] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.testHandle.expectTimings(),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])
    const { browserAppId } = JSON.parse(rumResponseBody).agent
    expect(timingsQuery.a).not.toEqual(loadTimeAppId)
    expect(timingsQuery.a).toEqual(browserAppId.toString())
  })
})
