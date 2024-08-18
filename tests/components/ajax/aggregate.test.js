import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { getNREUMInitializedAgent } from '../../../src/common/window/nreum'
import { getInfo } from '../../../src/common/config/config'
import * as hMod from '../../../src/common/event-emitter/handle'
import * as agentConstants from '../../../src/common/constants/agent-constants'
import qp from '@newrelic/nr-querypack'

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
  let ajaxAggregate, context, mockCurrentInfo
  beforeAll(async () => {
    mockCurrentInfo = { jsAttributes: {} }
    getInfo.mockReturnValue(mockCurrentInfo)

    const ajaxInstrument = new Ajax(agentIdentifier, new Aggregator({ agentIdentifier, ee }))
    await expect(ajaxInstrument.onAggregateImported).resolves.toEqual(true)
    ajaxAggregate = ajaxInstrument.featAggregate
    ajaxAggregate.drain()
  })
  const ajaxArguments = [
    { // params
      method: 'PUT',
      status: 200,
      host: 'https://example.com',
      hostname: 'example.com',
      pathname: '/pathname'
    },
    { // metrics
      txSize: 128,
      rxSize: 256,
      cbTime: 5
    },
    0, // startTime
    30, // endTime
    'XMLHttpRequest' // type
  ]
  beforeEach(() => {
    context = ajaxAggregate.ee.context({})
    jest.replaceProperty(agentConstants, 'MAX_PAYLOAD_SIZE', 1000000)
  })

  describe('storeXhr', () => {
    afterEach(() => {
      ajaxAggregate.ajaxEvents = []
      ajaxAggregate.spaAjaxEvents = {}
    })

    test('for a plain ajax request buffers in ajaxEvents', () => {
      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      expect(ajaxAggregate.ajaxEvents.length).toEqual(1) // non-SPA ajax requests are buffered in ajaxEvents
      expect(Object.keys(ajaxAggregate.spaAjaxEvents).length).toEqual(0)

      const ajaxEvent = ajaxAggregate.ajaxEvents[0]
      expect(ajaxEvent).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))
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
    afterEach(() => {
      mockCurrentInfo.jsAttributes = {} // reset jsattributes for other tests
    })

    test('correctly serializes an AjaxRequest events payload', () => {
      const expected = {
        type: 'ajax',
        start: 0,
        end: 30,
        callbackEnd: 30,
        callbackDuration: 0,
        domain: 'https://example.com',
        path: '/pathname',
        method: 'PUT',
        status: 200,
        requestedWith: 'XMLHttpRequest',
        requestBodySize: 128,
        responseBodySize: 256,
        nodeId: '0',
        guid: null,
        traceId: null,
        timestamp: null
      }

      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const expectedCustomAttributes = {
        customStringAttribute: 'customStringAttribute',
        customNumAttribute: 2,
        customBooleanAttribute: true,
        nullCustomAttribute: null,
        undefinedCustomAttribute: undefined // will be treated as null
      }
      mockCurrentInfo.jsAttributes = expectedCustomAttributes

      const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })
      // serializedPayload from ajax comes back as an array of bodies now, so we just need to decode each one and flatten
      // this decoding does not happen elsewhere in the app so this only needs to happen here in this specific test
      const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e))

      decodedEvents.forEach(payload => {
        payload.forEach(event => {
          validateCustomAttributeValues(expectedCustomAttributes, event.children)
          delete event.children

          expect(event).toEqual(expected) // event attributes serialized correctly
        })
      })
    })

    test('correctly serializes a very large AjaxRequest events payload', () => {
      for (let callNo = 0; callNo < 10; callNo++) ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const expectedCustomAttributes = {
        customStringAttribute: 'customStringAttribute',
        customNumAttribute: 2,
        customBooleanAttribute: true,
        undefinedCustomAttribute: undefined
      }
      mockCurrentInfo.jsAttributes = expectedCustomAttributes

      jest.replaceProperty(agentConstants, 'MAX_PAYLOAD_SIZE', 500)
      const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })
      const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e))

      expect(decodedEvents.length).toBeGreaterThan(1) // large payload of AJAX Events are broken into multiple chunks
      expect(serializedPayload.every(sp => !exceedsSizeLimit(sp))).toBeTruthy() // each chunks is less than the maxPayloadSize

      decodedEvents.forEach(payload => {
        payload.forEach(event => {
          validateCustomAttributeValues(expectedCustomAttributes, event.children) // Custom attributes are accounted for in chunked AJAX payloads
        })
      })

      function exceedsSizeLimit (payload) {
        return payload.length * 2 > 500
      }
    })

    test('correctly exits if maxPayload is too small', () => {
      for (let callNo = 0; callNo < 10; callNo++) ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      jest.replaceProperty(agentConstants, 'MAX_PAYLOAD_SIZE', 10) // this is too small for any AJAX payload to fit in
      const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })
      expect(serializedPayload.length).toEqual(0) // payload that are each too small for limit will be dropped
    })
  })
})

function validateCustomAttributeValues (expectedCustomAttributes, childrenNodes) {
  expect(childrenNodes.length).toEqual(Object.keys(expectedCustomAttributes).length)
  childrenNodes.forEach(attribute => {
    switch (attribute.type) {
      case 'stringAttribute':
      case 'doubleAttribute':
        expect(expectedCustomAttributes[attribute.key]).toEqual(attribute.value)
        break
      case 'trueAttribute':
        expect(expectedCustomAttributes[attribute.key]).toEqual(true)
        break
      case 'falseAttribute':
        expect(expectedCustomAttributes[attribute.key]).toEqual(false)
        break
      case 'nullAttribute':
        expect(expectedCustomAttributes[attribute.key]).toBeNil()
        break
      default:
        throw new Error('unexpected custom attribute type')
    }
  })
}
