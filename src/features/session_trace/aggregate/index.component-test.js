import { SessionTrace } from '..'
import { testExpectedTrace } from '../../../../tests/specs/util/helpers'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'

jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  getConfiguration: jest.fn(),
  getConfigurationValue: jest.fn((agentId, prop) => {
    if (prop === 'privacy.cookies_enabled') return true
  }),
  getInfo: jest.fn().mockReturnValue({
    licenseKey: 'licenseKey',
    applicationID: 'applicationID'
  }),
  isConfigured: jest.fn().mockReturnValue(true),
  getRuntime: jest.fn().mockReturnValue({
    xhrWrappable: true,
    offset: Date.now(),
    session: { state: { value: 'sessionID' }, write: jest.fn() }
  })
}))
jest.mock('../../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../common/window/load', () => ({
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
    ee.get('abcd').emit('rumresp-stn', [1])
    ee.get('abcd').emit('rumresp-ste', [1])
    const traceAggregate = traceInstrument.featAggregate
    traceAggregate.traceStorage.storeXhrAgg('xhr', '[200,null,null]', { method: 'GET', status: 200 }, { rxSize: 770, duration: 99, cbTime: 0, time: 217 }) // fake ajax data
    traceAggregate.traceStorage.processPVT('fi', 30, { fid: 8 }) // fake pvt data
    setTimeout(() => {
      const payload = traceAggregate.prepareHarvest()
      let res = payload.body

      testExpectedTrace({ data: { query: payload.qs, body: payload.body } })

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
    }, 1000)
  })
})
