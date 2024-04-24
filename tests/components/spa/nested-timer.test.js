import helpers from './helpers'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: { ST: setTimeout },
  getRuntime: jest.fn().mockReturnValue({}),
  isConfigured: jest.fn().mockReturnValue(true),
  getInfo: jest.fn().mockReturnValue({ jsAttributes: {} })
}))

let spaInstrument, spaAggregate, newrelic
const agentIdentifier = 'abcdefg'

beforeAll(async () => {
  const aggregator = new Aggregator({ agentIdentifier, ee })
  spaInstrument = new Spa(agentIdentifier, aggregator)
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

test('spa nested timers', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'after-2': true
      }
    },
    children: []
  })

  helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    setTimeout(() => {
      setTimeout(() => {
        newrelic.interaction().command('setAttribute', undefined, 'after-2', true)
        cb()
      })
    })
  }

  function afterInteractionDone (interaction) {
    expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
    expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
    validator.validate(interaction)
    done()
  }
})
