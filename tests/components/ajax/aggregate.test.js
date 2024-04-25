import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { getNREUMInitializedAgent } from '../../../src/common/window/nreum'
import * as hMod from '../../../src/common/event-emitter/handle'

window.fetch = jest.fn(() => Promise.resolve())
window.Request = jest.fn()
window.Response = jest.fn()
const { Ajax } = require('../../../src/features/ajax') // don't hoist this up with ES6 import

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/window/nreum')
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  originals: { REQ: jest.fn(), XHR: global.XMLHttpRequest },
  getConfiguration: jest.fn().mockReturnValue({ ajax: {} }),
  getConfigurationValue: jest.fn(),
  getLoaderConfig: jest.fn().mockReturnValue({}),
  getInfo: jest.fn().mockReturnValue({}),
  getRuntime: jest.fn().mockReturnValue({}),
  isConfigured: jest.fn().mockReturnValue(true)
}))
jest.mock('../../../src/common/window/load', () => ({
  onWindowLoad: jest.fn(cb => cb()) // importAggregator runs immediately
}))

let softNavInUse = false
getNREUMInitializedAgent.mockImplementation(() => { return { features: { [FEATURE_NAMES.softNav]: softNavInUse } } })
jest.spyOn(hMod, 'handle')
const agentIdentifier = 'abcdefg'

describe('Ajax aggregate', () => {
  let ajaxAggregate, context
  beforeAll(async () => {
    const ajaxInstrument = new Ajax(agentIdentifier, new Aggregator({ agentIdentifier, ee }))
    await expect(ajaxInstrument.onAggregateImported).resolves.toEqual(true)
    ajaxAggregate = ajaxInstrument.featAggregate
    ajaxAggregate.drain()
  })
  const ajaxArguments = [
    { // params
      method: 'PUT',
      status: 200,
      hostname: 'example.com',
      pathname: '/pathname'
    },
    { // metrics
      txSize: 128,
      rxSize: 256,
      cbTime: 5
    },
    0, // startTime
    10, // endTime
    'XMLHttpRequest' // type
  ]
  beforeEach(() => {
    context = ajaxAggregate.ee.context({})
  })

  describe('storeXhr', () => {
    test('for a plain ajax request buffers in ajaxEvents', () => {
      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      expect(ajaxAggregate.ajaxEvents.length).toEqual(1) // non-SPA ajax requests are buffered in ajaxEvents
      expect(Object.keys(ajaxAggregate.spaAjaxEvents).length).toEqual(0)

      const ajaxEvent = ajaxAggregate.ajaxEvents[0]
      expect(ajaxEvent).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))

      ajaxAggregate.ajaxEvents = [] // clear ajaxEvents buffer
    })

    test('for a (old) SPA ajax request buffers in spaAjaxEvents', () => {
      const interaction = { id: 0 }
      context.spaNode = { interaction }

      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const interactionAjaxEvents = ajaxAggregate.spaAjaxEvents[interaction.id]
      expect(interactionAjaxEvents.length).toEqual(1) // SPA ajax requests are buffered in spaAjaxEvents and under its interaction id
      expect(ajaxAggregate.ajaxEvents.length).toEqual(0)

      const spaAjaxEvent = interactionAjaxEvents[0]
      expect(spaAjaxEvent).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))

      ajaxAggregate.spaAjaxEvents = {} // clear spaAjaxEvents
    })

    test('for ajax under soft nav does not buffer and instead pipes it', () => {
      softNavInUse = true

      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      expect(ajaxAggregate.ajaxEvents.length).toEqual(0)
      expect(Object.keys(ajaxAggregate.spaAjaxEvents).length).toEqual(0)
      expect(hMod.handle).toHaveBeenLastCalledWith('ajax', [expect.objectContaining({ startTime: 0, path: '/pathname' })],
        undefined, FEATURE_NAMES.softNav, expect.any(Object))

      softNavInUse = false
    })
  })

  test('on interactionDiscarded, saved (old) SPA events are put back in ajaxEvents', () => {
    const interaction = { id: 0 }
    context.spaNode = { interaction }

    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)
    ajaxAggregate.ee.emit('interactionDone', [interaction, false])

    expect(ajaxAggregate.spaAjaxEvents[interaction.id]).toBeUndefined() // no interactions in SPA under interaction 0
    expect(ajaxAggregate.ajaxEvents.length).toEqual(1)

    ajaxAggregate.ajaxEvents = []
  })
  test('on returnAjax from soft nav, event is re-routed back into ajaxEvents', () => {
    softNavInUse = true

    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)
    const event = hMod.handle.mock.lastCall[1][0]
    ajaxAggregate.ee.emit('returnAjax', [event], context)

    expect(ajaxAggregate.ajaxEvents.length).toEqual(1)
    expect(ajaxAggregate.ajaxEvents[0]).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))

    softNavInUse = false
  })

  describe('prepareHarvest', () => {

  })
})

// function exceedsSizeLimit (payload, maxPayloadSize) {
//   return payload.length * 2 > maxPayloadSize
// }
