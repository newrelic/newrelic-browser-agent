import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import { setupAgent } from '../../setup-agent'
import { getConfiguration } from '../../../../src/common/config/init'
import { OBSERVED_EVENTS } from '../../../../src/features/generic_events/constants'

let agentSetup

beforeAll(() => {
  agentSetup = setupAgent()
})

describe('pageActions sub-feature', () => {
  test('should import if at least one child feature is enabled', async () => {
    const config = getConfiguration(agentSetup.agentIdentifier)
    config.page_action.enabled = true
    config.user_actions.enabled = false

    const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()
  })

  test('should not import if no child features are enabled', async () => {
    const config = getConfiguration(agentSetup.agentIdentifier)
    config.page_action.enabled = false
    config.user_actions.enabled = false

    const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeUndefined()
  })

  test('user actions should be observed if enabled', () => {
    const config = getConfiguration(agentSetup.agentIdentifier)
    config.page_action.enabled = false
    config.user_actions.enabled = true
    const handleSpy = jest.spyOn(handleModule, 'handle')

    const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, agentSetup.aggregator)
    OBSERVED_EVENTS.forEach(eventType => {
      const event = new Event(eventType)
      window.dispatchEvent(event)

      expect(handleSpy).toHaveBeenCalledWith('ua', [event], undefined, genericEventsInstrument.featureName, genericEventsInstrument.ee)
    })
  })
})
