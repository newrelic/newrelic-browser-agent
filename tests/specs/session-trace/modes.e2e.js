/*
 * All behavior and mode transition from error mode of Trace in tandem with the replay feature is tested in here.
 * Right now, Trace can only be in error mode when its stn flag is 0 but replay runs in error mode.
 */
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { stConfig, testExpectedTrace } from '../util/helpers'

describe('respects feature flags', () => {
  it('0, 0 == PERMANENTLY OFF', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)

    await Promise.all([
      browser.testHandle.expectTrace(10000, true),
      browser.execute(function () {
        newrelic.recordReplay()
      })])
  })

  it('0, 1 == PERMANENTLY OFF', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)

    await Promise.all([
      browser.testHandle.expectTrace(10000, true),
      browser.execute(function () {
        newrelic.recordReplay()
      })])
  })

  it('0, 2 == PERMANENTLY OFF', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)

    await Promise.all([
      browser.testHandle.expectTrace(10000, true),
      browser.execute(function () {
        newrelic.recordReplay()
      })])
  })

  it('1, 0 == TEMPORARILY OFF, TURNS ON IF ENTITLED (api)', async () => {
    await browser.destroyAgentSession()

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 1, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html',
      stConfig({ session_replay: { enabled: true } })
    )
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(10000),
      browser.execute(function () {
        newrelic.recordReplay()
      })])

    testExpectedTrace({ data: request })
  })

  it('1, 1 == STARTS IN FULL', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const { request } = await browser.testHandle.expectTrace()

    testExpectedTrace({ data: request })
  })

  it('1, 2 == STARTS IN ERROR, CHANGES TO FULL (noticeError)', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)

    const nodeCount = await browser.execute(function () {
      try {
        return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.nodeCount
      } catch (err) {
        return 0
      }
    })

    expect(nodeCount).toBeGreaterThan(0)

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(10000),
      browser.execute(function () {
        newrelic.noticeError('test')
      })])

    testExpectedTrace({ data: request })
  })

  it('1, 2 == STARTS IN ERROR, CHANGES TO FULL (thrown error)', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('js-error-with-error-after-page-load.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(),
      $('#trigger').click()
    ])
    testExpectedTrace({ data: request })
  })

  it('1, 2 == STARTS IN FULL MODE IF ERROR OCCURS BEFORE LOAD', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('js-error-with-error-before-page-load.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const { request } = await browser.testHandle.expectTrace()

    testExpectedTrace({ data: request })
  })

  it('does not capture more than the last 30 seconds when error happens', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.pause(30000)

    const [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])

    expect(request.body.find(node => node.n === 'loadEventEnd')).toBeUndefined() // that node should've been tossed out by now
  })

  it('does not perform final harvest while in error mode', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.testHandle.expectTrace(10000, true),
      browser.refresh()
    ])
  })

  it('Session tracking is disabled', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig({ privacy: { cookies_enabled: false } }))
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)
  })

  it('should not trigger session trace when an error is seen and mode is off', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, srs: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.testHandle.expectTrace(10000, true),
      browser.execute(function () { newrelic.noticeError(new Error('test')) })
    ])
  })
})
