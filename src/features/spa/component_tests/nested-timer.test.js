import helpers from './helpers'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { ee } from '../../../common/event-emitter/contextual-ee'
import { Spa } from '../index'
import { TimeKeeper } from '../../../common/timing/time-keeper'
import { INTERACTION_API } from '../constants'

jest.mock('../../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: { ST: setTimeout },
  getRuntime: jest.fn().mockReturnValue({ xhrWrappable: true }),
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

  newrelic = {
    interaction: function () {
      const newSandboxHandle = {
        command: function (cmd, customTime = TimeKeeper.now(), ...args) {
          spaAggregate.ee.emit(INTERACTION_API + cmd, [customTime, ...args], this)
          return this // most spa APIs should return a handle obj that allows for chaining further commands
        }
      }
      return newSandboxHandle.command('get')
    }
  }
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
