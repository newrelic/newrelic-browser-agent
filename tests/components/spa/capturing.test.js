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
  spaInstrument = new Spa({ agentIdentifier, info: {}, init: { spa: { enabled: true } }, runtime: {}, ee: ee.get(agentIdentifier) })
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

describe('SPA captures', () => {
  beforeEach(() => {
    newrelic.interaction().command('end') // delete any pending ixn in-between tests on the SPA singleton
  })

  test('nested timers', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      attrs: {
        custom: {
          'after-2': true
        }
      },
      children: []
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      setTimeout(() => {
        setTimeout(() => {
          newrelic.interaction().command('setAttribute', undefined, 'after-2', true)
          cb()
        })
      })
    }
  })

  test('multiple event handlers', done => {
    const validator = new helpers.InteractionValidator({
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

    expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null at first
    const el = document.createElement('div')
    el.addEventListener('click', () => {
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    })
    el.addEventListener('click', () => {
      const deadline = performance.now() + 100
      let x = 0
      while (performance.now() <= deadline) { x++ }
      // do something with x to prevent the loop from being optimized out
      const div = document.createElement('div')
      document.body.appendChild(div)
      div.innerHTML = x
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    })
    helpers.startInteraction(cb => cb(), afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier), element: el })
  })

  ;['keypress', 'keyup', 'keydown', 'change'].forEach(eventType => {
    test(`${eventType}`, done => {
      const validator = new helpers.InteractionValidator({
        attrs: { trigger: eventType },
        name: 'interaction',
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      })

      expect(spaAggregate.state.currentNode?.id).toBeFalsy()
      helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier), eventType })

      function onInteractionStart (cb) {
        setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
      }
    })
  })
})

function afterInteractionDone (spaAggregate, validator, done, interaction) {
  expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
  expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
  validator.validate(interaction)
  done()
}
