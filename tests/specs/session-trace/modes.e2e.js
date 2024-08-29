/*
 * All behavior and mode transition from error mode of Trace in tandem with the replay feature is tested in here.
 * Right now, Trace can only be in error mode when its stn flag is 0 but replay runs in error mode.
 */
import { testBlobTraceRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { stConfig, testExpectedTrace } from '../util/helpers'

describe('respects feature flags', () => {
  let sessionTraceCapture, url

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
    url = await browser.testHandle.assetURL('instrumented.html', stConfig())
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('0, 0 == PERMANENTLY OFF', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.recordReplay()
        }))
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('0, 1 == PERMANENTLY OFF', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.recordReplay()
        }))
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('0, 2 == PERMANENTLY OFF', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.recordReplay()
        }))
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('1, 0 == TEMPORARILY OFF, TURNS ON IF ENTITLED (api)', async () => {
    url = await browser.testHandle.assetURL('instrumented.html', stConfig({ session_replay: { enabled: true } }))
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 1, srs: 0, loaded: 1 })
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.recordReplay()
      })
    ])

    expect(sessionTraceHarvests.length).toBeGreaterThanOrEqual(1)
    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
  })

  it('1, 1 == STARTS IN FULL', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 1, srs: 0, loaded: 1 })
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBeGreaterThanOrEqual(1)
    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
  })

  it('1, 2 == STARTS IN ERROR, CHANGES TO FULL (noticeError)', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)

    const nodeCount = await browser.execute(function () {
      try {
        return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.nodeCount
      } catch (err) {
        return 0
      }
    })

    expect(nodeCount).toBeGreaterThan(0)

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        newrelic.noticeError('test')
      })
    ])

    expect(sessionTraceHarvests.length).toBeGreaterThanOrEqual(1)
    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
  })

  it('1, 2 == STARTS IN ERROR, CHANGES TO FULL (thrown error)', async () => {
    url = await browser.testHandle.assetURL('js-error-with-error-after-page-load.html', stConfig())
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)

    const nodeCount = await browser.execute(function () {
      try {
        return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.nodeCount
      } catch (err) {
        return 0
      }
    })

    expect(nodeCount).toBeGreaterThan(0)

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      $('#trigger').click()
    ])

    expect(sessionTraceHarvests.length).toBeGreaterThanOrEqual(1)
    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
  })

  it('1, 2 == STARTS IN FULL MODE IF ERROR OCCURS BEFORE LOAD', async () => {
    url = await browser.testHandle.assetURL('js-error-with-error-before-page-load.html', stConfig())
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBeGreaterThanOrEqual(1)
    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request }))
  })

  it('does not capture more than the last 30 seconds when error happens', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.pause(30000)

    const [[{ request }]] = await Promise.all([
      sessionTraceCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])

    expect(request.body.find(node => node.n === 'loadEventEnd')).toBeUndefined() // that node should've been tossed out by now
  })

  it('does not perform final harvest while in error mode', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    await browser.url(url).then(() => browser.waitForAgentLoad())

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.refresh()
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('Session tracking is disabled', async () => {
    url = await browser.testHandle.assetURL('instrumented.html', stConfig({ privacy: { cookies_enabled: false } }))
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })

  it('should not trigger session trace when an error is seen and mode is off', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toBe(0)
  })
})
