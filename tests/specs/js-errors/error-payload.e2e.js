const config = {
  init: {
    privacy: { cookies_enabled: true }
  }
}

describe('Error payloads', () => {
  it('should add session replay flag if active', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config)) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      Object.values(newrelic.initializedAgents)[0].runtime.session.state.sessionReplay = 1
      newrelic.noticeError(new Error('test'))
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(err[0].params).toEqual(expect.objectContaining({
      firstSeenAt: expect.any(Number),
      hasReplay: true
    }))
  })

  it('should NOT add session replay flag if not active', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(Object.keys(err[0].params).includes('hasReplay')).toEqual(false)
  })

  it('should set a timestamp, tied to the FIRST error seen', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const [before, after] = await browser.execute(function () {
      var a = 0
      var before = Date.now()
      while (a++ < 20) newrelic.noticeError(new Error('test'))
      var after = Date.now()
      return [before, after]
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(Math.abs(err[0].params.firstSeenAt - before) <= 1).toEqual(true)
    expect(Math.abs(err[0].params.firstSeenAt - after) <= 1).toEqual(false)
  })
})
