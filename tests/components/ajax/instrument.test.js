import * as handleModule from '../../../src/common/event-emitter/handle'
import { setupAgent } from '../setup-agent'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { CAPTURE_PAYLOAD_SETTINGS } from '../../../src/features/ajax/constants'

let mainAgent

beforeAll(async () => {
  mainAgent = setupAgent()
})

let ajaxInstrument

beforeEach(async () => {
  jest.spyOn(handleModule, 'handle')

  ajaxInstrument = new Ajax(mainAgent)
  jest.spyOn(ajaxInstrument.ee, 'emit')
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('ajax event is not captured or buffered for data urls', () => {
  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]
    expect(xhrContext.params.protocol).toEqual('data')
    expect(handleModule.handle).not.toHaveBeenCalledWith('xhr', expect.any(Array), xhrContext, FEATURE_NAMES.ajax)
  })

  test('fetch', async () => {
    await fetch('data:,dataUrl')

    const fetchContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'fetch-done')[2]
    expect(fetchContext.params.protocol).toEqual('data')
    expect(handleModule.handle).not.toHaveBeenCalledWith('xhr', expect.any(Array), fetchContext, FEATURE_NAMES.ajax)
  })
})

describe('request header capture', () => {
  test('XMLHttpRequest captures headers in lowercase', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('X-Custom-Header', 'test-value')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestHeaders).toEqual({
      'content-type': 'application/json',
      'x-custom-header': 'test-value'
    })
  })
})

describe('request body capture', () => {
  test('XMLHttpRequest captures human-readable JSON body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send('{"key":"value"}')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestBody).toEqual('{"key":"value"}')
  })

  test('XMLHttpRequest captures human-readable text/plain body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'text/plain')
    xhr.send('plain text message')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestBody).toEqual('plain text message')
  })

  test('XMLHttpRequest captures human-readable XML body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/xml')
    xhr.send('<root><item>value</item></root>')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestBody).toEqual('<root><item>value</item></root>')
  })

  test('XMLHttpRequest does not capture non-human-readable body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.send('binary data')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestBody).toBeUndefined()
  })
})

describe('query string extraction', () => {
  test('XMLHttpRequest extracts query parameters from URL', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'http://example.com/api?param1=value1&param2=value2')
    xhr.send()

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.requestQuery).toEqual({
      param1: 'value1',
      param2: 'value2'
    })
  })
})

describe('GQL metadata extraction', () => {
  test('XMLHttpRequest captures GQL metadata from request body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/graphql')
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify({
      query: 'query GetUser { user { name } }',
      operationName: 'GetUser'
    }))

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.params.gql).toEqual({
      operationName: 'GetUser',
      operationType: 'query',
      operationFramework: 'GraphQL'
    })
  })
})

describe('payload capture configuration', () => {
  // Note: Detailed payload capture behavior is tested in:
  // - tests/unit/features/ajax/instrument/capture-payloads.test.js for canCapturePayload logic
  // - tests/specs/ajax/payload_capture.e2e.js for full end-to-end capture scenarios
  // These tests just verify that the configuration constants are properly defined

  test('CAPTURE_PAYLOAD_SETTINGS constants are defined', () => {
    expect(CAPTURE_PAYLOAD_SETTINGS.OFF).toEqual('off')
    expect(CAPTURE_PAYLOAD_SETTINGS.ALL).toEqual('all')
    expect(CAPTURE_PAYLOAD_SETTINGS.FAILURES).toEqual('failures')
  })
})
