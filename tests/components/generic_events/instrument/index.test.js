import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { setupAgent } from '../../setup-agent'
import { OBSERVED_EVENTS } from '../../../../src/features/generic_events/constants'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { globalScope } from '../../../../src/common/constants/runtime'

let mainAgent
let genericEventsInstrument
let origXhr

beforeAll(() => {
  origXhr = global.XMLHttpRequest
  global.XMLHttpRequest = MockXMLHttpRequest

  mainAgent = setupAgent({
    info: {
      beacon: 'some-agent-endpoint.com:1234'
    }
  })
  genericEventsInstrument = new GenericEvents(mainAgent)
})

afterAll(() => {
  global.XMLHttpRequest = origXhr
})

describe('generic events sub-features', () => {
  test('should import if at least one child feature is enabled', async () => {
    mainAgent.init.page_action.enabled = true
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }

    let genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()

    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = true
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }

    genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()

    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: true, capture_measures: false, resources: { enabled: false } }

    genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()

    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: true, resources: { enabled: false } }

    genericEventsInstrument = new GenericEvents(mainAgent)

    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()

    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: true, asset_types: [], first_party_domains: [], ignore_newrelic: true } }

    genericEventsInstrument = new GenericEvents(mainAgent)

    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()
  })

  test('should not import if no child features are enabled', async () => {
    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }
    mainAgent.init.feature_flags = ['no_spv']

    const genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeUndefined()
  })

  test('should import if all other child features are disabled and websockets flag is enabled', async () => {
    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }
    mainAgent.init.web_sockets = { enabled: true }
    mainAgent.init.feature_flags = ['no_spv']

    const genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()
  })

  test('should import if all other child features are disabled and no_spv flag is absent (SPV is enabled)', async () => {
    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = false
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }
    mainAgent.init.feature_flags = []

    const genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()
  })

  test('user actions should be observed if enabled', () => {
    mainAgent.init.page_action.enabled = false
    mainAgent.init.user_actions.enabled = true
    mainAgent.init.performance = { capture_marks: false, capture_measures: false, resources: { enabled: false } }
    const handleSpy = jest.spyOn(handleModule, 'handle')

    const genericEventsInstrument = new GenericEvents(mainAgent)
    OBSERVED_EVENTS.forEach(eventType => {
      const event = new Event(eventType)
      window.dispatchEvent(event)

      expect(handleSpy).toHaveBeenCalledWith('ua', [event], undefined, genericEventsInstrument.featureName, genericEventsInstrument.ee)
    })
  })
})

describe('User frustrations - fetch', () => {
  let eeEmitSpy
  let handleSpy
  beforeEach(() => {
    handleSpy = jest.spyOn(handleModule, 'handle')
    eeEmitSpy = jest.spyOn(genericEventsInstrument.ee, 'emit')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  test('non-agent calls emit "uaXhr" events', async () => {
    await fetch('data:,dataUrl')

    expect(handleSpy).toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).toHaveBeenCalledWith('uaXhr', [], undefined)
  })
  test('agent xhr/fetch calls do not emit "uaXhr" events', async () => {
    await fetch('https://some-agent-endpoint.com:1234')

    expect(handleSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined)
  })
})

describe('User frustrations - XMLHttpRequest', () => {
  let eeEmitSpy
  let handleSpy
  beforeEach(() => {
    handleSpy = jest.spyOn(handleModule, 'handle')
    eeEmitSpy = jest.spyOn(genericEventsInstrument.ee, 'emit')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  test('non-agent calls emit "uaXhr" events', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()

    expect(handleSpy).toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).toHaveBeenCalledWith('uaXhr', [], undefined)
  })
  test('agent xhr/fetch calls do not emit "uaXhr" events', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://some-agent-endpoint.com:1234')
    xhr.send()

    expect(handleSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined)
  })

  test('urls are not mixed between interlaced xhr open and send calls', () => {
    const xhr1 = new XMLHttpRequest()
    xhr1.open('GET', 'https://some-agent-endpoint.com:1234')
    const xhr2 = new XMLHttpRequest()
    xhr2.open('GET', 'data:,dataUrl')

    // ensure agent call's url is not overridden by the second call
    xhr1.send()
    expect(handleSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined)

    xhr2.send()
    expect(handleSpy).toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).toHaveBeenCalledWith('uaXhr', [], undefined)
  })
})

describe('security policy violation reporting', () => {
  let handleSpy, addEventListenerSpy, origReportingObserver

  beforeEach(() => {
    handleSpy = jest.spyOn(handleModule, 'handle')
    addEventListenerSpy = jest.spyOn(globalScope, 'addEventListener')
    origReportingObserver = global.ReportingObserver
    mainAgent.init.feature_flags = []
  })

  afterEach(() => {
    global.ReportingObserver = origReportingObserver
    jest.restoreAllMocks()
  })

  function getSpvListener () {
    return addEventListenerSpy.mock.calls.find(([type]) => type === 'securitypolicyviolation')[1]
  }

  function mockSpvEvent (fields) {
    const evt = new Event('securitypolicyviolation')
    Object.defineProperties(evt, Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value }])))
    return evt
  }

  test('processes the buffered pre-attach batch, disconnects, and still reports post-attach violations via securitypolicyviolation', () => {
    let observerCallback
    const disconnectMock = jest.fn()
    const observeMock = jest.fn()
    global.ReportingObserver = jest.fn((cb) => {
      observerCallback = cb
      return { observe: observeMock, disconnect: disconnectMock }
    })

    const instrument = new GenericEvents(mainAgent)

    const bufferedReport = {
      type: 'csp-violation',
      body: {
        blockedURL: 'https://malicious.example/buffered',
        documentURL: 'https://test.com',
        effectiveDirective: 'script-src',
        originalPolicy: "default-src 'self'",
        sourceFile: 'https://test.com/index.js',
        statusCode: 200,
        lineNumber: 10,
        columnNumber: 4,
        disposition: 'enforce',
        sample: 'inline',
        referrer: 'https://referrer.test'
      }
    }

    observerCallback([bufferedReport])

    expect(observeMock).toHaveBeenCalledTimes(1)
    expect(disconnectMock).toHaveBeenCalledTimes(1)
    expect(handleSpy).toHaveBeenCalledWith('spv', [expect.objectContaining({
      blockedUrl: 'https://malicious.example/buffered',
      documentUrl: 'https://test.com'
    }), expect.any(Number)], undefined, FEATURE_NAMES.genericEvents, instrument.ee)

    handleSpy.mockClear()

    getSpvListener()(mockSpvEvent({
      blockedURI: 'https://malicious.example/post-attach',
      documentURI: 'https://test.com',
      effectiveDirective: 'script-src',
      sourceFile: 'https://test.com/index.js',
      lineNumber: 20,
      columnNumber: 4
    }))
    expect(handleSpy).toHaveBeenCalledWith('spv', [expect.objectContaining({
      blockedUrl: 'https://malicious.example/post-attach'
    }), expect.any(Number)], undefined, FEATURE_NAMES.genericEvents, instrument.ee)
  })

  test('still reports via securitypolicyviolation when ReportingObserver is unsupported', () => {
    global.ReportingObserver = undefined

    const instrument = new GenericEvents(mainAgent)

    getSpvListener()(mockSpvEvent({
      blockedURI: 'https://malicious.example',
      documentURI: 'https://test.com',
      effectiveDirective: 'script-src',
      sourceFile: 'https://test.com/index.js',
      lineNumber: 10,
      columnNumber: 4
    }))

    expect(handleSpy).toHaveBeenCalledWith('spv', [expect.objectContaining({
      blockedUrl: 'https://malicious.example'
    }), expect.any(Number)], undefined, FEATURE_NAMES.genericEvents, instrument.ee)
  })
})

// JSDom does not provide responseURL so we mock XHR to add it
class MockXMLHttpRequest {
  constructor () {
    this.readyState = 0
    this.status = 0
    this.responseText = ''
    this.responseURL = ''
    this._url = ''
  }

  onreadystatechange (url) {
    if (this.readyState === 1) {
      this._url = url
    } else if (this.readyState === 2) {
      this.responseURL = this._url
    }
    if (this._onreadystatechange) this._onreadystatechange()
  }

  open (method, url) {
    this.method = method
    this.readyState = 1
    this.onreadystatechange(url)
  }

  send () {
    this.readyState = 2
    this.responseText = 'Mock response'
    this.status = 200
    this.onreadystatechange()
  }

  addEventListener = (event, handler) => {
    if (event === 'readystatechange' && typeof handler === 'function') {
      this._onreadystatechange = handler
    }
  }
}
