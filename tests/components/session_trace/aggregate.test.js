import { Instrument as SessionTrace } from '../../../src/features/session_trace/instrument'
import { resetAgent, setupAgent } from '../setup-agent'
import { MODE } from '../../../src/common/session/constants'
import { ERROR_MODE_SECONDS_WINDOW, MAX_NODES_PER_HARVEST } from '../../../src/features/session_trace/constants'
import { EventBuffer } from '../../../src/features/utils/event-buffer'

let mainAgent

jest.retryTimes(0)

beforeAll(() => {
  mainAgent = setupAgent()
})

let sessionTraceAggregate

beforeEach(async () => {
  const sessionTraceInstrument = new SessionTrace(mainAgent)
  await new Promise(process.nextTick)
  sessionTraceAggregate = sessionTraceInstrument.featAggregate

  sessionTraceAggregate.ee.emit('rumresp', [{ st: 1, sts: MODE.FULL }])
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 100) // wait for the feature to initialize
  })
})

afterEach(() => {
  resetAgent(mainAgent)
  jest.clearAllMocks()
})

test('has event buffer storage', () => {
  expect(sessionTraceAggregate.traceStorage).toBeDefined()
  expect(sessionTraceAggregate.events).toBeInstanceOf(EventBuffer)
})

test('creates right nodes', async () => {
  // create session trace nodes for load events
  document.addEventListener('DOMContentLoaded', () => null)
  window.addEventListener('load', () => null)
  window.history.pushState(null, '', '#foo')
  window.history.pushState(null, '', '#bar')

  document.dispatchEvent(new CustomEvent('DOMContentLoaded')) // simulate natural browser event
  window.dispatchEvent(new CustomEvent('load')) // load is actually ignored by Trace as it should be passed by the PVT feature, so it should not be in payload
  sessionTraceAggregate.traceStorage.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
  sessionTraceAggregate.traceStorage.processPVT('fi', 30) // fake pvt data

  const payload = sessionTraceAggregate.makeHarvestPayload()
  let res = payload.body

  let node = res.filter(node => node.n === 'DOMContentLoaded')[0]
  expect(node).toBeTruthy()
  expect(node.s).toBeGreaterThan(10) // that DOMContentLoaded node has start time
  expect(node.o).toEqual('document') // that DOMContentLoaded origin is the document
  node = res.filter(node => node.n === 'load' && (node.o === 'document' || node.o === 'window'))[0]
  expect(node).toBeUndefined()

  let hist = res.filter(node => node.n === 'history.pushState')[1]
  const originalPath = window.location.pathname
  expect(hist.s).toEqual(hist.e) // that hist node has no duration
  expect(hist.n).toEqual('history.pushState')
  expect(hist.o).toEqual(`${originalPath}#bar`)
  expect(hist.t).toEqual(`${originalPath}#foo`)

  let ajax = res.filter(node => node.t === 'ajax')[0]
  expect(ajax.s).toBeLessThan(ajax.e) // that it has some duration
  expect(ajax.n).toEqual('Ajax')
  expect(ajax.t).toEqual('ajax')

  let pvt = res.filter(node => node.n === 'fi')[0]
  expect(pvt.o).toEqual('document')
  expect(pvt.s).toEqual(pvt.e) // that FI has no duration
  expect(pvt.t).toEqual('timing')

  let unknown = res.filter(n => n.o === 'unknown')
  expect(unknown.length).toEqual(0) // no events with unknown origin
})

test('prepareHarvest returns undefined if there are no trace nodes', () => {
  let payload = sessionTraceAggregate.makeHarvestPayload()
  expect(payload).toBeUndefined()
})

test('initialize only ever stores timings once', () => {
  const storeTimingSpy = jest.spyOn(sessionTraceAggregate.traceStorage, 'storeTiming')
  /** initialize was already called in setup, so we should not see a new call */
  sessionTraceAggregate.initialize()
  expect(storeTimingSpy).toHaveBeenCalledTimes(0)
})

/*
  Note about responseStart = 0.
  According to MDN docs, responseStart can be 0:
   - if the resource was instantaneously retrieved from a cache (reproduced in Safari when navigating back to a page, as of Apr 2026, Safari 26.4)
   - if the resource is a cross-origin request and no Timing-Allow-Origin HTTP response header is used.
   - if the resource is a canceled request.
 */
test('initialization - should still use L2 timings when responseStart is 0', async () => {
  // Simulate BFCache navigation where responseStart = 0 but other metrics are valid
  const mockNavEntry = {
    responseStart: 0,
    domContentLoadedEventEnd: 250,
    loadEventEnd: 300,
    domComplete: 280,
    domInteractive: 200
  }

  const testAgent = setupAgent()

  // Save original values
  const originalPerformanceNavigationTiming = global.PerformanceNavigationTiming
  const originalGetEntriesByType = performance.getEntriesByType

  // Mock PerformanceNavigationTiming constructor to pass the typeof check
  global.PerformanceNavigationTiming = function () {}

  // Mock performance.getEntriesByType to return our BFCache scenario
  performance.getEntriesByType = jest.fn((type) => {
    if (type === 'navigation') return [mockNavEntry]
    return originalGetEntriesByType.call(performance, type)
  })

  const sessionTraceInstrument = new SessionTrace(testAgent)
  await new Promise(process.nextTick)
  const testAggregate = sessionTraceInstrument.featAggregate

  // Mock drain to prevent it from clearing the buffer during initialization
  const drainSpy = jest.spyOn(testAggregate, 'drain').mockImplementation(() => {})
  const storeTimingSpy = jest.spyOn(testAggregate.traceStorage, 'storeTiming')

  // Act - triggers initialization, should use mockNavEntry NOT fall back to performance.timing
  testAggregate.ee.emit('rumresp', [{ st: 1, sts: MODE.FULL }])
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Assertions
  expect(performance.getEntriesByType).toHaveBeenCalledWith('navigation')
  expect(drainSpy).toHaveBeenCalled()

  // - Should be called with the navigation entry (isAbsoluteTimestamp = false, the default)
  expect(storeTimingSpy).toHaveBeenCalledWith(mockNavEntry)

  // - Should NOT be called with isAbsoluteTimestamp=true (legacy fallback path)
  const callsWithAbsoluteTimestamp = storeTimingSpy.mock.calls.filter(call => call[1] === true)
  expect(callsWithAbsoluteTimestamp.length).toBe(0)

  // - Verify that valid timing nodes were stored with correct values
  const bufferedEvents = testAggregate.events.get()

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'domContentLoadedEventEnd',
    s: 250,
    e: 250,
    o: 'document',
    t: 'timing'
  }))

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'loadEventEnd',
    s: 300,
    e: 300,
    o: 'document',
    t: 'timing'
  }))

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'domComplete',
    s: 280,
    e: 280,
    o: 'document',
    t: 'timing'
  }))

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'responseStart',
    s: 0,
    e: 0,
    o: 'document',
    t: 'timing'
  }))

  // Cleanup
  drainSpy.mockRestore()
  performance.getEntriesByType = originalGetEntriesByType
  global.PerformanceNavigationTiming = originalPerformanceNavigationTiming
  resetAgent(testAgent)
})

test('initialization - should still store in relative timestamps when called with L1/absolute timings', async () => {
  const testAgent = setupAgent()

  // Save original values
  const originalPerformanceNavigationTiming = global.PerformanceNavigationTiming
  const originalPerformanceTiming = performance.timing

  // Simulate legacy browser without PerformanceNavigationTiming
  delete global.PerformanceNavigationTiming

  // Mock performance.timing with absolute timestamps (legacy API)
  const mockAbsoluteTiming = {
    navigationStart: 1234567890000,
    domContentLoadedEventEnd: 1234567890250,
    loadEventEnd: 1234567890300
  }
  Object.defineProperty(performance, 'timing', {
    value: mockAbsoluteTiming,
    writable: true,
    configurable: true
  })

  const sessionTraceInstrument = new SessionTrace(testAgent)
  await new Promise(process.nextTick)
  const testAggregate = sessionTraceInstrument.featAggregate

  // Mock timeKeeper to have deterministic timestamp conversion
  testAggregate.agentRef.runtime.timeKeeper = {
    ready: true,
    correctAbsoluteTimestamp: (val) => val, // No correction
    convertAbsoluteTimestamp: (val) => val - 1234567890000 // Convert to relative by subtracting navigationStart
  }

  // Mock drain to prevent buffer clearing
  const drainSpy = jest.spyOn(testAggregate, 'drain').mockImplementation(() => {})
  const storeTimingSpy = jest.spyOn(testAggregate.traceStorage, 'storeTiming')

  // Act - triggers initialization, should use legacy path with absolute timestamps
  testAggregate.ee.emit('rumresp', [{ st: 1, sts: MODE.FULL }])
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Assertions
  // - Should be called with performance.timing and isAbsoluteTimestamp=true
  expect(storeTimingSpy).toHaveBeenCalledWith(mockAbsoluteTiming, true)

  // - Verify that timing nodes were stored with timestamps converted from absolute to relative
  const bufferedEvents = testAggregate.events.get()

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'navigationStart',
    s: 0, // 1234567890000 - 1234567890000 = 0
    e: 0,
    o: 'document',
    t: 'timing'
  }))

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'domContentLoadedEventEnd',
    s: 250, // 1234567890250 - 1234567890000 = 250
    e: 250,
    o: 'document',
    t: 'timing'
  }))

  expect(bufferedEvents).toContainEqual(expect.objectContaining({
    n: 'loadEventEnd',
    s: 300, // 1234567890300 - 1234567890000 = 300
    e: 300,
    o: 'document',
    t: 'timing'
  }))

  // Cleanup
  drainSpy.mockRestore()
  Object.defineProperty(performance, 'timing', {
    value: originalPerformanceTiming,
    writable: true,
    configurable: true
  })
  global.PerformanceNavigationTiming = originalPerformanceNavigationTiming
  resetAgent(testAgent)
})

test('tracks previously stored events and processes them once per occurrence', done => {
  document.addEventListener('visibilitychange', () => 1)
  document.addEventListener('visibilitychange', () => 2)
  document.addEventListener('visibilitychange', () => 3) // additional listeners should not generate additional nodes

  document.dispatchEvent(new Event('visibilitychange'))

  expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(1)

  setTimeout(() => { // some time gap
    document.dispatchEvent(new Event('visibilitychange'))

    const bufferedEvents = sessionTraceAggregate.events.get()

    expect(bufferedEvents[0]).toEqual(expect.objectContaining({
      n: 'visibilitychange',
      t: 'event',
      o: 'document'
    }))

    expect(bufferedEvents.length).toEqual(2)
    expect(bufferedEvents[0].s).not.toEqual(bufferedEvents[1].s) // should not have same start times
    expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(2)
    done()
  }, 100)
})

test('when max nodes per harvest is reached, no node is further added in FULL mode', () => {
  Object.defineProperty(sessionTraceAggregate.events, 'length', { value: MAX_NODES_PER_HARVEST })
  sessionTraceAggregate.mode = MODE.FULL

  sessionTraceAggregate.traceStorage.storeNode({ n: 'someNode', s: 123 })
  expect(sessionTraceAggregate.events.length).toEqual(MAX_NODES_PER_HARVEST) // remains at 1000
})

test('when max nodes per harvest is reached, node is still added in ERROR mode by clearing', () => {
  // Mock performance.now so it can be controlled in tests
  let now = 0
  jest.spyOn(performance, 'now').mockImplementation(() => now)
  sessionTraceAggregate.mode = MODE.ERROR
  for (let i = 0; i < MAX_NODES_PER_HARVEST; i++) {
    sessionTraceAggregate.traceStorage.storeNode({ n: 'someNode', s: 0 })
  }
  now = ERROR_MODE_SECONDS_WINDOW + 1 // simulate time passing
  sessionTraceAggregate.traceStorage.storeNode({ n: 'someNode', s: ERROR_MODE_SECONDS_WINDOW + 1 })
  expect(sessionTraceAggregate.events.length).toEqual(1) // should have cleared the trace storage and added the new node
  performance.now.mockRestore()
})

test('when max nodes per harvest is reached, node is still added by dropping the oldest node', () => {
  sessionTraceAggregate.mode = MODE.ERROR
  for (let i = 0; i < MAX_NODES_PER_HARVEST; i++) {
    sessionTraceAggregate.traceStorage.storeNode({ n: 'someNode', s: performance.now(), e: performance.now() })
  }

  const newEvt = { n: 'someNode', s: performance.now(), e: performance.now() }
  sessionTraceAggregate.traceStorage.storeNode(newEvt)
  expect(sessionTraceAggregate.events.length).toBeLessThanOrEqual(MAX_NODES_PER_HARVEST)
  expect(sessionTraceAggregate.events.get().at(-1)).toEqual(newEvt)
})

test('aborted ST feat does not continue to hog event ref in memory from storeEvent', () => {
  sessionTraceAggregate.blocked = true // simulate aborted condition
  sessionTraceAggregate.traceStorage.clear()
  expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(0)

  const someClick = new Event('click')
  sessionTraceAggregate.traceStorage.storeEvent(someClick, 'document', 0, 100)
  expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(0)

  sessionTraceAggregate.blocked = false // reset blocked state
})
