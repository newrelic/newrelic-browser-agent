import qp from '@newrelic/nr-querypack'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { getNREUMInitializedAgent } from '../../../src/common/window/nreum'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { resetAgent, setupAgent } from '../setup-agent'
import { EventContext } from '../../../src/common/event-emitter/event-context'

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

let fakeAgent

beforeAll(() => {
  fakeAgent = setupAgent()
})

let ajaxAggregate, context

beforeEach(async () => {
  jest.spyOn(handleModule, 'handle')

  const ajaxInstrument = new Ajax(fakeAgent)
  await new Promise(process.nextTick)
  ajaxAggregate = ajaxInstrument.featAggregate
  ajaxAggregate.ee.emit('rumresp', [])
  ajaxAggregate.drain()

  context = new EventContext()
})

afterEach(() => {
  resetAgent(fakeAgent.agentIdentifier)
  jest.clearAllMocks()
})

test('on returnAjax from soft nav, event is re-routed back into ajaxEvents', () => {
  getNREUMInitializedAgent(fakeAgent.agentIdentifier).features = {
    [FEATURE_NAMES.softNav]: {} // Set to truthy object to simulate soft nav being present
  }

  ajaxAggregate.ee.emit('xhr', ajaxArguments, context)
  const event = jest.mocked(handleModule.handle).mock.lastCall[1][0]
  ajaxAggregate.ee.emit('returnAjax', [event], context)

  expect(ajaxAggregate.events.get().length).toEqual(1)
  expect(ajaxAggregate.events.get()[0]).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))
})

test('on long task emitted under ajax, its context is set with latestLongtaskEnd', () => {
  const xhr = new XMLHttpRequest()
  const ctx = ajaxAggregate.ee.context(xhr)
  expect(ctx.latestLongtaskEnd).toEqual(0)
  ajaxAggregate.ee.emit('long-task', [{ end: 150.15 }, xhr])
  expect(ctx.latestLongtaskEnd).toEqual(150.15)
})

describe('storeXhr', () => {
  test('for a plain ajax request buffers in ajaxEvents', () => {
    // Ensure soft nav is NOT present to test plain ajax behavior
    delete getNREUMInitializedAgent(fakeAgent.agentIdentifier).features

    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    expect(ajaxAggregate.events.get().length).toEqual(1) // non-SPA ajax requests are buffered in ajaxEvents

    const ajaxEvent = ajaxAggregate.events.get()[0]
    expect(ajaxEvent).toEqual(expect.objectContaining({ startTime: 0, path: '/pathname' }))
  })

  test('for ajax under soft nav does not buffer and instead pipes it', () => {
    getNREUMInitializedAgent(fakeAgent.agentIdentifier).features = {
      [FEATURE_NAMES.softNav]: {} // Set to truthy object to simulate soft nav being present
    }

    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    expect(ajaxAggregate.events.get().length).toEqual(0)
    expect(handleModule.handle).toHaveBeenLastCalledWith(
      'ajax',
      [expect.objectContaining({ startTime: 0, path: '/pathname' }), expect.any(EventContext)],
      undefined,
      FEATURE_NAMES.softNav,
      expect.any(Object)
    )
  })
})

describe('prepareHarvest', () => {
  test('correctly serializes an AjaxRequest events payload', () => {
    // Ensure soft nav is NOT present so events buffer in ajaxEvents
    delete getNREUMInitializedAgent(fakeAgent.agentIdentifier).features

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
    fakeAgent.info.jsAttributes = expectedCustomAttributes

    const serializedPayload = ajaxAggregate.makeHarvestPayload(false)
    // serializedPayload from ajax comes back as an array of bodies now, so we just need to decode each one and flatten
    // this decoding does not happen elsewhere in the app so this only needs to happen here in this specific test
    const decodedEvents = qp.decode(serializedPayload.body)

    decodedEvents.forEach(event => {
      validateCustomAttributeValues(expectedCustomAttributes, event.children)
      delete event.children

      expect(event).toEqual(expected) // event attributes serialized correctly
    })
  })

  test('correctly exits if maxPayload is too small', async () => {
    // Ensure soft nav is NOT present so events buffer in ajaxEvents
    delete getNREUMInitializedAgent(fakeAgent.agentIdentifier).features

    for (let callNo = 0; callNo < 10; callNo++) {
      ajaxAggregate.ee.emit('xhr', [{ ...ajaxArguments[0], pathname: 'x'.repeat(1000000) }, ...ajaxArguments], context)
    }

    const serializedPayload = ajaxAggregate.makeHarvestPayload(false)
    expect(serializedPayload).toBeUndefined() // payload that are each too small for limit will be dropped
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
