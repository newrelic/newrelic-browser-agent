import { testBlobTraceRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { stConfig } from '../util/helpers.js'
import { JSONPath } from 'jsonpath-plus'

describe('Trace nodes', () => {
  let sessionTraceCapture

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('are not duplicated for events', async () => {
    const url = await browser.testHandle.assetURL('pagehide.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        const storedEvents = Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.prevStoredEvents
        for (let i = 0; i < 10; i++) storedEvents.add(i) // artificially add "events" since the counter is otherwise unreliable
      }).then(() =>
        $('#btn1').click() // since the agent has multiple listeners on vischange, this is a good example of often duplicated event
      )
    ])

    sessionTraceHarvests.forEach(harvest => {
      const vischangeEvts = JSONPath({ path: '$.request.body.[?(!!@ && @.t===\'event\' && @.n===\'visibilitychange\')]', json: harvest })
      expect(vischangeEvts.length).toBeLessThanOrEqual(1)
    })

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

  it('are not duplicated for resources', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const events = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.t===\'resource\' && @.n===\'script\')]', json: sessionTraceHarvests })
    expect(events.length).toEqual(1) // our /build/nr-__.min.js
  })

  it('are not duplicated for history pushState', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        history.pushState({}, '')
      })
    ])

    const events = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.n===\'history.pushState\')]', json: sessionTraceHarvests })
    expect(events.length).toEqual(1)
    expect(events[0].t.endsWith('/instrumented.html')).toBeTruthy()
  })

  it('are created and not duplicated for ajax', async () => {
    const url = await browser.testHandle.assetURL('fetch.html', stConfig())
    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
    ])

    const events = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.n===\'Ajax\' && @.o.match(/\\/json$/i))]', json: sessionTraceHarvests })
    expect(events.length).toEqual(1)
  })

  it('are created and not duplicated for one error', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    const [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url).then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError('hello session traces i am error')
        }))
    ])

    const events = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.n===\'error\' && @.o===\'hello session traces i am error\')]', json: sessionTraceHarvests })
    expect(events.length).toEqual(1)
  })

  it('are not duplicated for timings', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => $('body').click())
    ])

    const eventCounts = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.t===\'timing\')]', json: sessionTraceHarvests })
      .reduce((acc, node) => {
        acc[node.n] = ++acc[node.n] || 1
        return acc
      }, {})
    expect(Object.values(eventCounts).some(count => count > 1)).toBeFalsy()
  })
})

function getEventsSetSize () {
  return Object.values(newrelic.initializedAgents)[0].features.session_trace.featAggregate.traceStorage.prevStoredEvents.size
}
