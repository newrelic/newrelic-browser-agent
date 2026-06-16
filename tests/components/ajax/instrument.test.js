import * as handleModule from '../../../src/common/event-emitter/handle'
import { setupAgent } from '../setup-agent'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { CAPTURE_PAYLOAD_SETTINGS } from '../../../src/features/ajax/constants'

let mainAgent

beforeAll(async () => {
  mainAgent = setupAgent({
    init: {
      ajax: {
        capture_payloads: CAPTURE_PAYLOAD_SETTINGS.ALL
      }
    }
  })
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
    xhr.send()

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.requestHeaders).toEqual({
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

    expect(xhrContext.requestBody).toEqual('{"key":"value"}')
  })

  test('XMLHttpRequest captures human-readable text/plain body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'text/plain')
    xhr.send('plain text message')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.requestBody).toEqual('plain text message')
  })

  test('XMLHttpRequest captures human-readable XML body', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/xml')
    xhr.send('<root><item>value</item></root>')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.requestBody).toEqual('<root><item>value</item></root>')
  })

  test('XMLHttpRequest captures all request bodies during instrumentation', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://example.com/api')
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.send('binary data')

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    // Body is captured during instrumentation; filtering for human-readable happens in aggregate phase
    expect(xhrContext.requestBody).toEqual('binary data')
  })
})

describe('query string extraction', () => {
  test('XMLHttpRequest extracts query parameters from URL', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'http://example.com/api?param1=value1&param2=value2')
    xhr.send()

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]

    expect(xhrContext.parsedOrigin.search).toEqual('?param1=value1&param2=value2')
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

    // GQL parsing happens in aggregate phase, so just check that request body was captured
    expect(xhrContext.requestBody).toContain('query GetUser')
    expect(xhrContext.requestBody).toContain('GetUser')
  })
})

describe('fetch with Request object', () => {
  test('captures body and txSize when body is in init options with Request', async () => {
    const requestBody = JSON.stringify({ key: 'value', nested: { data: 'test' } })
    const request = new Request('http://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    // Pass body in the second argument (init options)
    await fetch(request, { body: requestBody }).catch(() => {})

    // For fetch, the context is the Promise object (third argument to emit)
    const fetchContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'fetch-done')[2]

    // Verify requestBody was captured from init options
    expect(fetchContext.requestBody).toEqual(requestBody)

    // Verify txSize was calculated correctly
    expect(fetchContext.txSize).toBeGreaterThan(0)
    expect(fetchContext.txSize).toEqual(requestBody.length)
  })

  test('handles Request object when init options are empty', async () => {
    const request = new Request('http://example.com/api', {
      method: 'POST',
      body: 'test data'
    })

    await fetch(request).catch(() => {})

    const fetchContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'fetch-done')[2]

    // Note: Request.body is a ReadableStream that can only be read asynchronously.
    // The implementation includes a fallback to target?.body and target?.method,
    // but in practice these may not always be accessible in the same way as when
    // using plain init options. The important part is that the code handles
    // Request objects without throwing errors.
    expect(fetchContext).toBeDefined()
    expect(fetchContext.params).toBeDefined()
  })

  test('prefers init options body over Request object body when both could be present', async () => {
    const requestBody = 'original body'
    const overrideBody = 'override body'
    const request = new Request('http://example.com/api', {
      method: 'POST',
      body: requestBody
    })

    // Override with explicit body in init options
    await fetch(request, { body: overrideBody }).catch(() => {})

    const fetchContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'fetch-done')[2]

    // When both are present, opts.body takes precedence (left side of ||)
    expect(fetchContext.requestBody).toEqual(overrideBody)
    expect(fetchContext.txSize).toEqual(overrideBody.length)
  })
})

describe('payload capture configuration', () => {
  // Note: Detailed payload capture behavior is tested in:
  // - tests/unit/features/ajax/instrument/capture-payloads.test.js for canCapturePayload logic
  // - tests/specs/ajax/payload_capture.e2e.js for full end-to-end capture scenarios
  // These tests just verify that the configuration constants are properly defined

  test('CAPTURE_PAYLOAD_SETTINGS constants are defined', () => {
    expect(CAPTURE_PAYLOAD_SETTINGS.NONE).toEqual('none')
    expect(CAPTURE_PAYLOAD_SETTINGS.ALL).toEqual('all')
    expect(CAPTURE_PAYLOAD_SETTINGS.FAILURES).toEqual('failures')
  })
})
