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

    expect(resources.request.query.fsh).toBeUndefined() // this param should not exist when session is not enabled (test default)
  })

  it('fsh is included and correctly set with session enabled', async () => {
    await browser.destroyAgentSession()
    let testURL = await browser.testHandle.assetURL('stn/instrumented.html', { init: { privacy: { cookies_enabled: true } } })

    let stnToHarvest = browser.testHandle.expectResources()
    await browser.url(testURL).then(() => browser.waitForAgentLoad())
    let stn = await stnToHarvest

    expect(stn.request.query.fsh).toEqual('1')

    let finalStnHarvest = browser.testHandle.expectResources()
    await browser.url(await browser.testHandle.assetURL('/'))
    stn = await finalStnHarvest

    expect(stn.request.query.fsh).toEqual('0') // basically any subsequent harvests

    // Load another page within same session, and the first harvest should not have fsh = 1 this time.
    testURL = await browser.testHandle.assetURL('instrumented.html', { init: { privacy: { cookies_enabled: true } } })
    stnToHarvest = browser.testHandle.expectResources()
    await browser.url(testURL).then(() => browser.waitForAgentLoad())
    stn = await stnToHarvest
    expect(stn.request.query.fsh).toEqual('0')
  })
})
