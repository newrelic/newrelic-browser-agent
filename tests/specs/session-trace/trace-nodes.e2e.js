import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { stConfig } from '../util/helpers.js'

describe('Trace nodes', () => {
  beforeEach(async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
  })

  it('are not duplicated for events', async () => {
    const url = await browser.testHandle.assetURL('pagehide.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      const storedEvents = Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.prevStoredEvents
      for (let i = 0; i < 10; i++) storedEvents.add(i) // artificially add "events" since the counter is otherwise unreliable
    })
    const resPromise = browser.testHandle.expectTrace()
    $('#btn1').click() // since the agent has multiple listeners on vischange, this is a good example of often duplicated event
    const { request } = await resPromise

    const vischangeEvts = request.body.filter(node => node.t === 'event' && node.n === 'visibilitychange')
    expect(vischangeEvts.length).toEqual(1)

    // In addition, our Set keeping track of stored Events should have reset during harvest to prevent mem leak.
    const trackedEventsPostHarvest = await browser.execute(getEventsSetSize)
    expect(trackedEventsPostHarvest).toBeLessThan(10)
  })

  it('are not stored for events when trace is not on', async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 0, sts: 0, sr: 0, err: 1, ins: 1, spa: 0, loaded: 1 })
    })

    const url = await browser.testHandle.assetURL('pagehide.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())
    await $('#btn1').click()
    const numTrackedEvents = await browser.execute(getEventsSetSize)
    expect(numTrackedEvents).toEqual(0)
  })

  function getEventsSetSize () {
    return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.prevStoredEvents.size
  }

  it('are not duplicated for resources', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    let { request } = await browser.testHandle.expectTrace()
    const fetchedScripts = request.body.filter(node => node.t === 'resource' && node.n === 'script')
    expect(fetchedScripts.length).toEqual(1) // our /build/nr-__.min.js
  })

  it('are not duplicated for history pushState', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([browser.testHandle.expectTrace(), browser.execute(function () {
      history.pushState({}, '')
    })]).then(([{ request: { body } }]) => {
      const hist = body.filter(node => node.n === 'history.pushState')
      expect(hist.length).toEqual(1)
      expect(hist[0].t.endsWith('/instrumented.html')).toBeTruthy()
    })
  })

  it('are created and not duplicated for ajax', async () => {
    const url = await browser.testHandle.assetURL('fetch.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace().then(({ request: { body } }) => {
      const reqs = body.filter(node => node.n === 'Ajax' && node.o.endsWith('/json'))
      expect(reqs.length).toEqual(1)
    })
  })

  it('are created and not duplicated for one error', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await Promise.all([browser.testHandle.expectTrace(), browser.execute(function () {
      newrelic.noticeError('hello session traces i am error')
    })]).then(([{ request: { body } }]) => {
      const errs = body.filter(node => node.n === 'error' && node.o === 'hello session traces i am error')
      expect(errs.length).toEqual(1)
    })
  })

  it('are not duplicated for timings', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    let [{ request }] = await Promise.all([
      browser.testHandle.expectTrace(),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])
    const countTimings = {}
    request.body.filter(node => node.t === 'timing').forEach(node => (countTimings[node.n] = ++countTimings[node.n] || 1))

    ;[{ request }] = await Promise.all([browser.testHandle.expectTrace(), $('body').click()]) // click to trigger FI & LCP timings
    request.body.filter(node => node.t === 'timing').forEach(node => (countTimings[node.n] = ++countTimings[node.n] || 1))

    expect(Object.values(countTimings).some(count => count > 1)).toBeFalsy()
  })
})
