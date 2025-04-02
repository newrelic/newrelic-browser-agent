import helpers from './helpers'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/info', () => ({
  __esModule: true,
  isValid: jest.fn().mockReturnValue(true)
}))
jest.mock('../../../src/common/harvest/harvester')

let spaInstrument, spaAggregate, newrelic
const agentIdentifier = 'abcdefg'
const baseEE = ee.get(agentIdentifier)

beforeAll(async () => {
  spaInstrument = new Spa({ agentIdentifier, info: {}, init: { spa: { enabled: true }, privacy: {} }, runtime: {}, ee: baseEE })
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

test('is instrumented with SPA', done => {
  const validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }, {
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE })

  const el = document.createElement('div')
  const observer = new MutationObserver(function () {
    setTimeout(newrelic.interaction().createTracer('timer', function () {}))
  })
  observer.observe(el, { childList: true })

  function onInteractionStart (cb) {
    el.innerHTML = 'mutated'
    setTimeout(newrelic.interaction().createTracer('timer', cb))
  }

  function afterInteractionDone (interaction) {
    expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
    expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
    validator.validate(interaction)
    done()
  }
})
