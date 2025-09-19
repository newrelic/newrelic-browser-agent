import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { setupAgent } from '../../setup-agent'
import { OBSERVED_EVENTS } from '../../../../src/features/generic_events/constants'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

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

    const genericEventsInstrument = new GenericEvents(mainAgent)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeUndefined()
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

// JSDom does not provide responseURL so we mock XHR to add it
class MockXMLHttpRequest {
  constructor () {
    this.readyState = 0
    this.status = 200
    this.responseText = ''
    this.responseURL = ''
    this.onreadystatechange = null
  }

  open (method, url) {
    this.method = method
    this.responseURL = url
    this.readyState = 1
  }

  send () {
    this.readyState = 4
    this.responseText = 'Mock response'
    if (this.onreadystatechange) {
      this.onreadystatechange()
    }
  }

  addEventListener = jest.fn()
}
