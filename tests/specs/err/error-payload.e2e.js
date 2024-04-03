/* globals errorFn, noticeErrorFn */

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
      .then(() => browser.waitForFeatureAggregate('jserrors'))

    await browser.execute(function () {
      Object.values(newrelic.initializedAgents)[0].runtime.session.state.sessionReplayMode = 1
      newrelic.noticeError(new Error('test'))
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(err[0].params).toEqual(expect.objectContaining({
      hasReplay: true
    }))
  })

  it('should NOT add session replay flag if not active', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
      .then(() => browser.waitForFeatureAggregate('jserrors'))

    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(err[0].params).not.toEqual(expect.objectContaining({
      hasReplay: true
    }))
  })

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const [relativeTimestamp, absoluteTimestamp] = await browser.execute(function () {
      var timeKeeper = Object.values(newrelic.initializedAgents)[0].config.runtime.timeKeeper
      var start = performance.now()
      for (var i = 0; i < 20; i++) { newrelic.noticeError(new Error('test')) }
      return [start, timeKeeper.convertRelativeTimestamp(start)]
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    expect(relativeTimestamp).toBeWithin(err[0].metrics.time.min - 1, err[0].metrics.time.max + 1)
    expect(err[0].params.firstOccurrenceTimestamp).toBeWithin(Math.floor(absoluteTimestamp), Math.floor(absoluteTimestamp + 100))
    expect(err[0].params.timestamp).toBeWithin(Math.floor(absoluteTimestamp), Math.floor(absoluteTimestamp + 100))
  })

  it('simultaneous errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForAgentLoad())

    const originTime = await browser.execute(function () {
      var timeKeeper = Object.values(newrelic.initializedAgents)[0].config.runtime.timeKeeper
      for (var i = 0; i < 2; i++) { errorFn() }
      return timeKeeper.correctedOriginTime
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    const [firstTime, secondTime] = await browser.execute(function () {
      return [window['error-0'], window['error-1']]
    })

    expect(err[0].params.firstOccurrenceTimestamp).toBeWithin(Math.floor(originTime + firstTime), Math.floor(originTime + secondTime + 10))
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - noticeError', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForFeatureAggregate('jserrors'))

    await browser.execute(function () {
      noticeErrorFn()
    })

    const { request: { body: { err: err1 } } } = await browser.testHandle.expectErrors()

    await browser.execute(function () {
      noticeErrorFn()
    })

    const { request: { body: { err: err2 } } } = await browser.testHandle.expectErrors()

    expect(err2[0].params.firstOccurrenceTimestamp).toEqual(err1[0].params.firstOccurrenceTimestamp)
  })

  it('subsequent errors - should set a timestamp, tied to the FIRST error seen - thrown errors', async () => {
    await browser.url(await browser.testHandle.assetURL('duplicate-errors.html')) // Setup expects before loading the page
      .then(() => browser.waitForFeatureAggregate('jserrors'))

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
