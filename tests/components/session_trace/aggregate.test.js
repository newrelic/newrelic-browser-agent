import { Instrument as SessionTrace } from '../../../src/features/session_trace/instrument'
import { setupAgent } from '../setup-agent'
import { MODE } from '../../../src/common/session/constants'
import { MAX_NODES_PER_HARVEST } from '../../../src/features/session_trace/constants'

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent()
})

let sessionTraceAggregate

beforeEach(async () => {
  const sessionTraceInstrument = new SessionTrace(mainAgent)
  await new Promise(process.nextTick)
  sessionTraceAggregate = sessionTraceInstrument.featAggregate

  sessionTraceAggregate.ee.emit('rumresp', [{ st: 1, sts: MODE.FULL }])
  await new Promise(process.nextTick)
})

test('creates right nodes', async () => {
  // create session trace nodes for load events
  document.addEventListener('DOMContentLoaded', () => null)
  window.addEventListener('load', () => null)
  window.history.pushState(null, '', '#foo')
  window.history.pushState(null, '', '#bar')

  document.dispatchEvent(new CustomEvent('DOMContentLoaded')) // simulate natural browser event
  window.dispatchEvent(new CustomEvent('load')) // load is actually ignored by Trace as it should be passed by the PVT feature, so it should not be in payload
  sessionTraceAggregate.events.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
  sessionTraceAggregate.events.processPVT('fi', 30) // fake pvt data

  const payload = sessionTraceAggregate.makeHarvestPayload()[0].payload
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
  jest.spyOn(sessionTraceAggregate.events, 'takeSTNs')

  let payload = sessionTraceAggregate.makeHarvestPayload()
  expect(payload).toBeUndefined()
  expect(sessionTraceAggregate.events.takeSTNs).not.toHaveBeenCalled()
})

test('initialize only ever stores timings once', () => {
  const storeTimingSpy = jest.spyOn(sessionTraceAggregate.events, 'storeTiming')
  /** initialize was already called in setup, so we should not see a new call */
  sessionTraceAggregate.initialize()
  expect(storeTimingSpy).toHaveBeenCalledTimes(0)
})

test('tracks previously stored events and processes them once per occurrence', done => {
  document.addEventListener('visibilitychange', () => 1)
  document.addEventListener('visibilitychange', () => 2)
  document.addEventListener('visibilitychange', () => 3) // additional listeners should not generate additional nodes

  document.dispatchEvent(new Event('visibilitychange'))
  expect(sessionTraceAggregate.events.trace.visibilitychange[0]).toEqual(expect.objectContaining({
    n: 'visibilitychange',
    t: 'event',
    o: 'document'
  }))
  expect(sessionTraceAggregate.events.prevStoredEvents.size).toEqual(1)

  setTimeout(() => { // some time gap
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sessionTraceAggregate.events.trace.visibilitychange.length).toEqual(2)
    expect(sessionTraceAggregate.events.trace.visibilitychange[0].s).not.toEqual(sessionTraceAggregate.events.trace.visibilitychange[1].s) // should not have same start times
    expect(sessionTraceAggregate.events.prevStoredEvents.size).toEqual(2)
    done()
  }, 100)
})

test('when max nodes per harvest is reached, no node is further added in FULL mode', () => {
  sessionTraceAggregate.events.nodeCount = MAX_NODES_PER_HARVEST
  sessionTraceAggregate.mode = MODE.FULL

  sessionTraceAggregate.events.storeSTN({ n: 'someNode', s: 123 })
  expect(sessionTraceAggregate.events.nodeCount).toEqual(MAX_NODES_PER_HARVEST)
  expect(Object.keys(sessionTraceAggregate.events.trace).length).toEqual(0)
})

test('when max nodes per harvest is reached, node is still added in ERROR mode', () => {
  sessionTraceAggregate.events.nodeCount = MAX_NODES_PER_HARVEST
  sessionTraceAggregate.mode = MODE.ERROR
  jest.spyOn(sessionTraceAggregate.events, 'trimSTNs').mockReturnValue(MAX_NODES_PER_HARVEST)

  sessionTraceAggregate.events.storeSTN({ n: 'someNode', s: 123 })
  expect(sessionTraceAggregate.events.nodeCount).toEqual(MAX_NODES_PER_HARVEST + 1)
  expect(Object.keys(sessionTraceAggregate.events.trace).length).toEqual(1)
})
