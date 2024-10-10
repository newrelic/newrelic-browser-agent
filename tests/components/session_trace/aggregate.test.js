import { Instrument as SessionTrace } from '../../../src/features/session_trace/instrument'
import { setupAgent } from '../setup-agent'
import { MODE } from '../../../src/common/session/constants'

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
  sessionTraceAggregate.traceStorage.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
  sessionTraceAggregate.traceStorage.processPVT('fi', 30, { fid: 8 }) // fake pvt data

  const payload = sessionTraceAggregate.prepareHarvest()
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
  pvt = res.filter(node => node.n === 'fid')[0]
  expect(pvt.o).toEqual('document')
  expect(pvt.s).toEqual(30) // that FID has a duration relative to FI'
  expect(pvt.e).toEqual(30 + 8)
  expect(pvt.t).toEqual('event')

  let unknown = res.filter(n => n.o === 'unknown')
  expect(unknown.length).toEqual(0) // no events with unknown origin
})

test('prepareHarvest returns undefined if there are no trace nodes', () => {
  jest.spyOn(sessionTraceAggregate.traceStorage, 'takeSTNs')

  let payload = sessionTraceAggregate.prepareHarvest()
  expect(payload).toBeUndefined()
  expect(sessionTraceAggregate.traceStorage.takeSTNs).not.toHaveBeenCalled()
})

test('tracks previously stored events and processes them once per occurrence', done => {
  document.addEventListener('visibilitychange', () => 1)
  document.addEventListener('visibilitychange', () => 2)
  document.addEventListener('visibilitychange', () => 3) // additional listeners should not generate additional nodes

  document.dispatchEvent(new Event('visibilitychange'))
  expect(sessionTraceAggregate.traceStorage.trace.visibilitychange[0]).toEqual(expect.objectContaining({
    n: 'visibilitychange',
    t: 'event',
    o: 'document'
  }))
  expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(1)

  setTimeout(() => { // some time gap
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sessionTraceAggregate.traceStorage.trace.visibilitychange.length).toEqual(2)
    expect(sessionTraceAggregate.traceStorage.trace.visibilitychange[0].s).not.toEqual(sessionTraceAggregate.traceStorage.trace.visibilitychange[1].s) // should not have same start times
    expect(sessionTraceAggregate.traceStorage.prevStoredEvents.size).toEqual(2)
    done()
  }, 100)
})
