import helpers from './helpers'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/info', () => ({
  __esModule: true,
  getInfo: jest.fn().mockReturnValue({ jsAttributes: {} }),
  isValid: jest.fn().mockReturnValue(true)
}))
jest.mock('../../../src/common/config/init', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn()
}))
jest.mock('../../../src/common/config/runtime', () => ({
  __esModule: true,
  getRuntime: jest.fn().mockReturnValue({})
}))

let spaInstrument, spaAggregate, newrelic
const agentIdentifier = 'abcdefg'

beforeAll(async () => {
  spaInstrument = new Spa({ agentIdentifier, info: {}, init: { spa: { enabled: true } }, runtime: {} })
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

test('initial page load timing', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    jsTime: 0,
    attrs: {
      custom: {
        'from-start': true
      }
    },
    children: []
  })

  helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier), eventType: 'initialPageLoad' })

  function onInteractionStart (cb) {
    let x = 0
    while (x < 10000) x++
    let e = window.document.createElement('div')
    e.innerHTML = x
    newrelic.interaction().command('setAttribute', undefined, 'from-start', true)
    cb()
  }

  function afterInteractionDone (interaction) {
    setTimeout(() => {
      expect(interaction.root.attrs.trigger).toEqual('initialPageLoad')
      expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
      expect(interaction.root.attrs.id).toBeTruthy() // interaction should have assigned uid
      expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
      validator.validate(interaction)
      done()
    }, 0)
  }
})
