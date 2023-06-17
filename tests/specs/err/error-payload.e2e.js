const config = {
  init: {
    privacy: { cookies_enabled: true }
  }
}

describe('error payloads', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should add session replay flag if active', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config)) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      Object.values(newrelic.initializedAgents)[0].runtime.session.state.sessionReplay = 1
      newrelic.noticeError(new Error('test'))
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(err[0].params).toEqual(expect.objectContaining({
      firstOccurrenceTimestamp: expect.any(Number),
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

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
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

    expect(Math.abs(err[0].params.firstOccurrenceTimestamp - before) <= 5).toEqual(true)
    expect(Math.abs(err[0].params.firstOccurrenceTimestamp - after) <= 5).toEqual(false)
  })

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      for (var i = 0; i < 2; i++) { errorFn() }
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    const [firstTime, secondTime] = await browser.execute(function () {
      return [window['error-0'], window['error-1']]
    })

    expect(Math.abs(err[0].params.firstOccurrenceTimestamp - firstTime) <= 5).toEqual(true)
    expect(Math.abs(err[0].params.firstOccurrenceTimestamp - secondTime) <= 5).toEqual(false)
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      newrelic.noticeError()
    })

    const { request: { body: { err: err1 } } } = await browser.testHandle.expectErrors()

    await browser.execute(function () {
      newrelic.noticeError()
    })

    const { request: { body: { err: err2 } } } = await browser.testHandle.expectErrors()
    expect(err2[0].params.firstOccurrenceTimestamp).toEqual(err1[0].params.firstOccurrenceTimestamp)
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      errorFn()
    })

    const { request: { body: { err: err1 } } } = await browser.testHandle.expectErrors()

    await browser.execute(function () {
      errorFn()
    })

    const { request: { body: { err: err2 } } } = await browser.testHandle.expectErrors()
    expect(err2[0].params.firstOccurrenceTimestamp).toEqual(err1[0].params.firstOccurrenceTimestamp)
  })
})
