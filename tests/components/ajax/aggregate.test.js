import qp from '@newrelic/nr-querypack'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { getNREUMInitializedAgent } from '../../../src/common/window/nreum'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { resetAgent, setupAgent } from '../setup-agent'
import { EventContext } from '../../../src/common/event-emitter/event-context'
import { getInfo } from '../../../src/common/config/info'

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

let agentSetup

beforeAll(() => {
  agentSetup = setupAgent()
})

let ajaxAggregate, context

beforeEach(async () => {
  jest.spyOn(handleModule, 'handle')

  const ajaxInstrument = new Ajax(agentSetup.agentIdentifier, agentSetup.aggregator)
  await new Promise(process.nextTick)
  ajaxAggregate = ajaxInstrument.featAggregate
  ajaxAggregate.drain()

  context = new EventContext()

  getNREUMInitializedAgent(agentSetup.agentIdentifier).features = {
    [FEATURE_NAMES.softNav]: false
  }
})

afterEach(() => {
  resetAgent(agentSetup.agentIdentifier)
  jest.clearAllMocks()
})

test('on interactionDiscarded, saved (old) SPA events are put back in ajaxEvents', () => {
  const interaction = { id: 0 }
  context.spaNode = { interaction }

  ajaxAggregate.ee.emit('xhr', ajaxArguments, context)
  ajaxAggregate.ee.emit('interactionDone', [interaction, false])

  expect(ajaxAggregate.spaAjaxEvents[interaction.id]).toBeUndefined() // no interactions in SPA under interaction 0
  expect(ajaxAggregate.ajaxEvents.length).toEqual(1)
})

test('on returnAjax from soft nav, event is re-routed back into ajaxEvents', () => {
  getNREUMInitializedAgent(agentSetup.agentIdentifier).features = {
    [FEATURE_NAMES.softNav]: true
  }

  ajaxAggregate.ee.emit('xhr', ajaxArguments, context)
  const event = jest.mocked(handleModule.handle).mock.lastCall[1][0]
  ajaxAggregate.ee.emit('returnAjax', [event], context)

  expect(ajaxAggregate.ajaxEvents.length).toEqual(1)
  expect(ajaxAggregate.ajaxEvents[0]).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))
})

describe('storeXhr', () => {
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
    getNREUMInitializedAgent(agentSetup.agentIdentifier).features = {
      [FEATURE_NAMES.softNav]: true
    }

    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    expect(ajaxAggregate.ajaxEvents.length).toEqual(0)
    expect(Object.keys(ajaxAggregate.spaAjaxEvents).length).toEqual(0)
    expect(handleModule.handle).toHaveBeenLastCalledWith(
      'ajax',
      [expect.objectContaining({ startTime: 0, path: '/pathname' })],
      undefined,
      FEATURE_NAMES.softNav,
      expect.any(Object)
    )
  })
})

describe('prepareHarvest', () => {
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
      nullCustomAttribute: null
    }
    getInfo(agentSetup.agentIdentifier).jsAttributes = expectedCustomAttributes

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
      nullCustomAttribute: null
    }
    getInfo(agentSetup.agentIdentifier).jsAttributes = expectedCustomAttributes

    const maxPayloadSize = (ajaxAggregate.MAX_PAYLOAD_SIZE = 500)
    const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })

    expect(serializedPayload.length).toBeGreaterThan(1) // large payload of AJAX Events are broken into multiple chunks
    expect(serializedPayload.every(sp => sp.body.e.length < maxPayloadSize)).toBeTruthy() // each chunks is less than the maxPayloadSize

    const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e))
    decodedEvents.forEach(payload => {
      payload.forEach(event => {
        validateCustomAttributeValues(expectedCustomAttributes, event.children) // Custom attributes are accounted for in chunked AJAX payloads
      })
    })
  })

  test('correctly exits if maxPayload is too small', () => {
    for (let callNo = 0; callNo < 10; callNo++) ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    ajaxAggregate.MAX_PAYLOAD_SIZE = 10 // this is too small for any AJAX payload to fit in
    const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })
    expect(serializedPayload.length).toEqual(0) // payload that are each too small for limit will be dropped
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
