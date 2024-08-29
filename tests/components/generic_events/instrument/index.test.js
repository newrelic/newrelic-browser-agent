import { Instrument as GenericEvents } from '../../../../src/features/generic_events/instrument'
import { setupAgent } from '../../setup-agent'
import { getConfiguration } from '../../../../src/common/config/init'

let agentSetup

beforeAll(() => {
  agentSetup = setupAgent()
})

describe('pageActions sub-feature', () => {
  test('should import if event source is enabled', async () => {
    getConfiguration(agentSetup.agentIdentifier).page_action = { enabled: true }

    const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeDefined()
  })

  test('should not import if event source is not enabled', async () => {
    getConfiguration(agentSetup.agentIdentifier).page_action = { enabled: false }

    const genericEventsInstrument = new GenericEvents(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)

    expect(genericEventsInstrument.featAggregate).toBeUndefined()
  })
})
