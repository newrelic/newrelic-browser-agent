import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { setupAgent } from '../../setup-agent'
import { OBSERVED_EVENTS } from '../../../../src/features/generic_events/constants'

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent()
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
