import helpers from './helpers'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: { ST: setTimeout, CT: clearTimeout },
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

describe('SPA timers tracking', () => {
  beforeEach(() => {
    newrelic.interaction().command('end') // delete any pending ixn in-between tests on the SPA singleton
  })

  test('clearTimeout ends setTimeout tracking', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      children: []
    })

    expect(spaAggregate.state.currentNode?.id).toBeFalsy()
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      // cancel timer1 after 5ms so that it never fires, do this first to avoid race conditions
      setTimeout(() => clearTimeout(timer1), 5)

      const timer1 = setTimeout(() => {
        expect(true).toEqual(false) // timer 1 should be cancelled, and should never fire
        cb()
      }, 10)

      setTimeout(cb, 100)
    }

    function afterInteractionDone (interaction) {
      expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
      expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
      validator.validate(interaction)
      done()
    }
  })

  test('clearTimeout still works inside callback', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      children: []
    })

    expect(spaAggregate.state.currentNode?.id).toBeFalsy()
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      new Promise(() => {
        let t = setTimeout(() => {
          expect(true).toEqual(false) // cancelled timer should never fire
        })
        clearTimeout(t)
        cb()
      })
    }

    function afterInteractionDone (interaction) {
      expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
      expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
      validator.validate(interaction)
      done()
    }
  })
})
