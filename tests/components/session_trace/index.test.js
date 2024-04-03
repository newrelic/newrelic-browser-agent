import { SessionTrace } from '../../../src/features/session_trace'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'

jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn().mockReturnValue(undefined),
  isConfigured: jest.fn().mockReturnValue(true),
  getRuntime: jest.fn().mockReturnValue({
    xhrWrappable: true,
    offset: Date.now()
  })
}))
jest.mock('../../../src/common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../src/common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => cb())
}))

const aggregator = new Aggregator({ agentIdentifier: 'abcd', ee })

describe('session trace', () => {
  test('creates right nodes', async () => {
    const traceInstrument = new SessionTrace('abcd', aggregator)

    // create session trace nodes for load events
    document.addEventListener('DOMContentLoaded', () => null)
    window.addEventListener('load', () => null)
    window.history.pushState(null, '', '#foo')
    window.history.pushState(null, '', '#bar')

    document.dispatchEvent(new CustomEvent('DOMContentLoaded')) // simulate natural browser event
    window.dispatchEvent(new CustomEvent('load')) // load is actually ignored by Trace as it should be passed by the PVT feature, so it should not be in payload
    await traceInstrument.onAggregateImported

    const traceAggregate = traceInstrument.featAggregate
    traceAggregate.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
    traceAggregate.processPVT('fi', 30, { fid: 8 }) // fake pvt data
    traceAggregate.operationalGate.decide(true) // all the nodes get created from buffered data

    traceAggregate.resourceObserver = true // so takeSTNs will skip check for performance entries
    const payload = traceInstrument.featAggregate.takeSTNs()
    let res = payload.body.res
    let qs = payload.qs

    expect(+qs.st).toBeGreaterThan(1404952055986)
    expect(+qs.st).toBeLessThan(Date.now())

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
})
