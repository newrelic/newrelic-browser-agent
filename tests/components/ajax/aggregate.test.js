import qp from '@newrelic/nr-querypack'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { getNREUMInitializedAgent } from '../../../src/common/window/nreum'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { resetAgent, setupAgent } from '../setup-agent'
import { EventContext } from '../../../src/common/event-emitter/event-context'
import { AJAX_ID, CAPTURE_PAYLOAD_SETTINGS } from '../../../src/features/ajax/constants'

const ajaxArguments = [
  { // params
    method: 'PUT',
    status: 200,
    host: 'example.com:443',
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
  resetAgent(fakeAgent)
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

  describe('data shapes', () => {
    beforeEach(() => {
      fakeAgent.features = {}
    })

    test('timeslice metric params should have expected keys', () => {
      fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present
      fakeAgent.init.ajax.capture_payloads = CAPTURE_PAYLOAD_SETTINGS.ALL

      context.requestHeaders = { 'content-type': 'application/json' }
      context.requestBody = 'fooBody'
      context.responseHeaders = { 'content-type': 'application/json' }
      context.responseBody = 'barBody'
      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const expectedParams = ['method', 'status', 'host', 'hostname', 'pathname']
      const actualParams = Object.keys(fakeAgent.sharedAggregator.get(['xhr']).xhr[0].params)
      expect(actualParams.sort()).toEqual(expectedParams.sort())
    })

    test('ajax event has expected keys', () => {
      fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present
      fakeAgent.init.ajax.capture_payloads = CAPTURE_PAYLOAD_SETTINGS.ALL

      context.requestHeaders = { 'content-type': 'application/json' }
      context.requestBody = 'fooBody'
      context.responseHeaders = { 'content-type': 'application/json' }
      context.responseBody = 'barBody'
      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const expectedEventKeys = ['method', 'status', 'domain', 'path', 'requestSize', 'responseSize', 'type', 'startTime', 'endTime', 'callbackDuration', 'ajaxRequest.id', 'gql', 'requestQuery', 'requestHeaders', 'responseHeaders', 'requestBody', 'responseBody']
      const actualEventKeys = Object.keys(ajaxAggregate.events.get()[0])
      expect(actualEventKeys.sort()).toEqual(expectedEventKeys.sort())
    })

    test('session trace bstXhrAgg params has expected keys', () => {
      fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present
      fakeAgent.init.ajax.capture_payloads = CAPTURE_PAYLOAD_SETTINGS.ALL

      context.requestHeaders = { 'content-type': 'application/json' }
      context.requestBody = 'fooBody'
      context.responseHeaders = { 'content-type': 'application/json' }
      context.responseBody = 'barBody'
      ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

      const bstXhrCalls = jest.mocked(handleModule.handle).mock.calls.filter(call => call[0] === 'bstXhrAgg')
      expect(bstXhrCalls).toHaveLength(1)
      const expectedParams = ['method', 'status', 'host', 'hostname', 'pathname']
      const actualParams = Object.keys(bstXhrCalls[0][1][2])
      expect(actualParams.sort()).toEqual(expectedParams.sort())
    })
  })

  test('captures payload when proxy beacon hostname and pathname does not match', async () => {
    fakeAgent = setupAgent({
      init: {
        ajax: { block_internal: false, capture_payloads: CAPTURE_PAYLOAD_SETTINGS.ALL },
        proxy: { beacon: 'example.com/foobar' }
      }
    })

    const ajaxInstrument = new Ajax(fakeAgent)
    await new Promise(process.nextTick)
    ajaxAggregate = ajaxInstrument.featAggregate
    ajaxAggregate.ee.emit('rumresp', [])
    ajaxAggregate.drain()

    context = new EventContext()
    fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present

    context.requestHeaders = { 'content-type': 'application/json' }
    context.requestBody = 'fooBody'
    context.responseHeaders = { 'content-type': 'application/json' }
    context.responseBody = 'barBody'
    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    const expectedEventKeys = ['method', 'status', 'domain', 'path', 'requestSize', 'responseSize', 'type', 'startTime', 'endTime', 'callbackDuration', 'ajaxRequest.id', 'gql', 'requestQuery', 'requestHeaders', 'responseHeaders', 'requestBody', 'responseBody']
    const actualEvent = Object.keys(ajaxAggregate.events.get()[0])
    expect(actualEvent.sort()).toEqual(expectedEventKeys.sort())
  })

  test('excludes internal payloads matches beacon hostname', async () => {
    fakeAgent = setupAgent({
      init: { ajax: { block_internal: false, capture_payloads: CAPTURE_PAYLOAD_SETTINGS.ALL } },
      info: { beacon: 'example.com' }
    })

    const ajaxInstrument = new Ajax(fakeAgent)
    await new Promise(process.nextTick)
    ajaxAggregate = ajaxInstrument.featAggregate
    ajaxAggregate.ee.emit('rumresp', [])
    ajaxAggregate.drain()

    context = new EventContext()
    fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present

    context.requestHeaders = { 'content-type': 'application/json' }
    context.requestBody = 'fooBody'
    context.responseHeaders = { 'content-type': 'application/json' }
    context.responseBody = 'barBody'
    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    const expectedEventKeys = ['method', 'status', 'domain', 'path', 'requestSize', 'responseSize', 'type', 'startTime', 'endTime', 'callbackDuration', 'ajaxRequest.id', 'gql']
    const actualEvent = Object.keys(ajaxAggregate.events.get()[0])
    expect(actualEvent.sort()).toEqual(expectedEventKeys.sort())
  })

  test('excludes internal payloads matches proxy beacon hostname and pathname', async () => {
    fakeAgent = setupAgent({
      init: {
        ajax: { block_internal: false, capture_payloads: CAPTURE_PAYLOAD_SETTINGS.ALL },
        proxy: { beacon: 'example.com/foobar' }
      }
    })

    const ajaxInstrument = new Ajax(fakeAgent)
    await new Promise(process.nextTick)
    ajaxAggregate = ajaxInstrument.featAggregate
    ajaxAggregate.ee.emit('rumresp', [])
    ajaxAggregate.drain()

    context = new EventContext()
    fakeAgent.features[FEATURE_NAMES.jserrors] = {} // Set to truthy object to simulate jserrors being present

    context.requestHeaders = { 'content-type': 'application/json' }
    context.requestBody = 'fooBody'
    context.responseHeaders = { 'content-type': 'application/json' }
    context.responseBody = 'barBody'

    const origPathname = ajaxArguments[0].pathname
    ajaxArguments[0].pathname = '/foobar/baz' // Starts with the proxy beacon pathname
    ajaxAggregate.ee.emit('xhr', ajaxArguments, context)

    const expectedEventKeys = ['method', 'status', 'domain', 'path', 'requestSize', 'responseSize', 'type', 'startTime', 'endTime', 'callbackDuration', 'ajaxRequest.id', 'gql']
    const actualEvent = Object.keys(ajaxAggregate.events.get()[0])
    expect(actualEvent.sort()).toEqual(expectedEventKeys.sort())

    ajaxArguments[0].pathname = origPathname
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
      domain: 'example.com:443',
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
      [AJAX_ID]: expect.any(String) // all AjaxRequest events should have a unique identifier to allow for easier grouping and analysis in the UI
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

  test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('obfuscation happens before truncation and result stays under 4KB for %s requests', async (method) => {
    // Ensure soft nav is NOT present so events buffer in ajaxEvents
    delete getNREUMInitializedAgent(fakeAgent.agentIdentifier).features

    // Save original config to restore later
    const originalObfuscate = fakeAgent.init.obfuscate
    const originalAjaxConfig = fakeAgent.init.ajax

    // Create an obfuscation rule that EXPANDS the data
    // Replace short pattern with much longer replacement (10x expansion)
    fakeAgent.init.obfuscate = [{
      regex: /X/g,
      replacement: 'OBFUSCATED_VALUE_REPLACEMENT_TEXT', // 32 chars vs 1 char = 32x expansion
      eventFilter: ['AjaxRequest'] // Must match EVENT_TYPES.AJAX value
    }]

    // Enable payload capture
    fakeAgent.init.ajax = { capture_payloads: 'all' }

    // Recreate ajaxAggregate with new config
    const ajaxInstrumentWithObfuscation = new Ajax(fakeAgent)
    await new Promise(process.nextTick)
    const ajaxAggregateWithObfuscation = ajaxInstrumentWithObfuscation.featAggregate
    ajaxAggregateWithObfuscation.ee.emit('rumresp', [])
    ajaxAggregateWithObfuscation.drain()

    // Create a large payload with many X characters that will expand significantly when obfuscated
    // Using 200 X's per line for 25 lines = 5000 chars before obfuscation
    // After obfuscation: 200 * 32 * 25 = 160,000 chars (way over 4KB)
    const largePayloadWithPattern = Array(25).fill('X'.repeat(200)).join('\n')

    // Set context with large request body that will expand during obfuscation
    const testContext = new EventContext()
    testContext.requestBody = largePayloadWithPattern
    testContext.requestHeaders = { 'content-type': 'application/json' }

    // Create ajax arguments with the specific HTTP method being tested
    const testAjaxArguments = [
      { ...ajaxArguments[0], method },
      ...ajaxArguments.slice(1)
    ]

    ajaxAggregateWithObfuscation.ee.emit('xhr', testAjaxArguments, testContext)

    const serializedPayload = ajaxAggregateWithObfuscation.makeHarvestPayload(false)
    const decodedEvents = qp.decode(serializedPayload.body)

    expect(decodedEvents.length).toBe(1)
    const event = decodedEvents[0]

    // Verify the method was captured correctly
    expect(event.method).toBe(method)

    // Find the requestBody attribute in children
    const requestBodyAttr = event.children.find(child => child.key === 'requestBody')
    expect(requestBodyAttr).toBeDefined()

    // Verify the value was obfuscated (contains the replacement text)
    expect(requestBodyAttr.value).toContain('OBFUSCATED_VALUE_REPLACEMENT_TEXT')

    // Verify the value was truncated - should end with ' ...'
    expect(requestBodyAttr.value).toMatch(/ \.\.\.$/i)

    // Verify the final byte size is under 4096 bytes (4092 + 4 for ' ...')
    const byteLength = Buffer.byteLength(requestBodyAttr.value, 'utf8')
    expect(byteLength).toBeLessThanOrEqual(4096)

    // Verify it's close to the limit (was actually truncated, not just small)
    expect(byteLength).toBeGreaterThan(4000)

    // Restore original config
    fakeAgent.init.obfuscate = originalObfuscate
    fakeAgent.init.ajax = originalAjaxConfig
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
