describe('STN Payload metadata checks', () => {
  it('adds metadata query attrs', async () => {
    await browser.url(await browser.testHandle.assetURL('stn/instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    // n == node count
    const resources = await browser.testHandle.expectResources()
    expect(Number(resources.request.query.n)).toEqual(resources.request.body.res.length)

    // fts == first timestamp
    const ms = resources.request.query.fts - resources.request.query.st
    const firstNode = resources.request.body.res.reduce((acc, next) => (!acc || next.s < acc) ? next.s : acc, undefined)
    expect(ms).toBeGreaterThanOrEqual(0)
    expect(ms).toEqual(firstNode)

    // hr === hasReplay
    expect(resources.request.query.hr).toEqual('0')
  })
})
