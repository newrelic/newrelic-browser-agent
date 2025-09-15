import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { setupAgent } from '../../setup-agent'
import { OBSERVED_EVENTS } from '../../../../src/features/generic_events/constants'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

let mainAgent
let genericEventsInstrument

beforeAll(() => {
  mainAgent = setupAgent({
    info: {
      beacon: 'some-agent-endpoint.com:1234'
    }
  })
  genericEventsInstrument = new GenericEvents(mainAgent)
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
describe('non-agent xhr/fetch calls re-emit "uaXhr" events', () => {
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

  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()

    expect(handleSpy).toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).toHaveBeenCalledWith('uaXhr', [], undefined)
  })

  test('fetch', async () => {
    await fetch('data:,dataUrl')

    expect(handleSpy).toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).toHaveBeenCalledWith('uaXhr', [], undefined)
  })
})

describe('agent xhr/fetch calls do not re-emit "uaXhr" events', () => {
  let eeEmitSpy
  let handleSpy
  beforeEach(() => {
    eeEmitSpy = jest.spyOn(genericEventsInstrument.ee, 'emit')
    handleSpy = jest.spyOn(handleModule, 'handle')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })
  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://some-agent-endpoint.com:1234')
    xhr.send()

    expect(handleSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined)
  })

  test('fetch', async () => {
    await fetch('https://some-agent-endpoint.com:1234')

    expect(handleSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
    expect(eeEmitSpy).not.toHaveBeenCalledWith('uaXhr', [], undefined)
  })
})
