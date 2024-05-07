/* globals errorFn, noticeErrorFn */

describe('error payloads', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
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

    const correctedOriginTime = await browser.execute(function () {
      var timeKeeper = Object.values(newrelic.initializedAgents)[0].config.runtime.timeKeeper
      for (var i = 0; i < 2; i++) { errorFn() }
      return timeKeeper.correctedOriginTime
    })

    const { request: { body: { err } } } = await browser.testHandle.expectErrors()

    const [firstTime, secondTime] = await browser.execute(function () {
      return [window['error-0'], window['error-1']]
    })

    expect(err[0].params.firstOccurrenceTimestamp).toBeWithin(Math.floor(correctedOriginTime + firstTime), Math.floor(correctedOriginTime + secondTime + 10))
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
    expect(err2[0].params.timestamp).not.toEqual(err1[0].params.timestamp)
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
    expect(err2[0].params.timestamp).not.toEqual(err1[0].params.timestamp)
  })

  it('errors without a stack trace still get line and col when present', async () => {
    const [{ request: { body: { err } } }] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('js-error-no-stack.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
    ])

    expect(err[0].params.stack_trace.match(/<inline>:[0-9]+:[0-9]+/).length).toEqual(1)
  })

  it('noticeError called with no arguments does not throw or capture any error', async () => {
    await Promise.all([
      browser.testHandle.expectErrors(10000, true), // should not harvest an error (neither the noticeError call or an error from calling the API with no arg)
      browser.url(await browser.testHandle.assetURL('instrumented.html')) // Setup expects before loading the page
        .then(() => browser.waitForFeatureAggregate('jserrors'))
        .then(() => browser.execute(function () { newrelic.noticeError() }))
    ])
  })
})
