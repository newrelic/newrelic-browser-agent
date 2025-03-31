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
jest.mock('../../../src/common/harvest/harvester')

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
    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      // cancel timer1 after 5ms so that it never fires, do this first to avoid race conditions
      setTimeout(() => clearTimeout(timer1), 5)

      const timer1 = setTimeout(() => {
        expect(true).toEqual(false) // timer 1 should be cancelled, and should never fire
        cb()
      }, 10)

      setTimeout(cb, 100)
    }
  })

  test('clearTimeout still works inside callback', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      children: []
    })

    expect(spaAggregate.state.currentNode?.id).toBeFalsy()
    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      new Promise(() => {
        let t = setTimeout(() => {
          expect(true).toEqual(false) // cancelled timer should never fire
        })
        clearTimeout(t)
        cb()
      })
    }
  })

  test('callback is timed', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      jsTime: 50,
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        jsTime: 100,
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      setTimeout(() => newrelic.interaction().createTracer('timer', () => {
        blockFor(100)
        cb()
      })(), 100)
      blockFor(50)
    }
  })

  test('callback is timed through multiple callback tasks', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      jsTime: 50,
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        jsTime: 200,
        children: []
      }]
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      setTimeout(() => newrelic.interaction().createTracer('timer', () => {
        setTimeout(() => {
          blockFor(100)
        }, 0)
        setTimeout(() => {
          blockFor(100)
          cb()
        }, 1)
      })(), 0)
      blockFor(50)
    }
  })

  test('callback is timed for microtasks too', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      jsTime: 150,
      children: []
    })

    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      Promise.resolve().then(function () {
        blockFor(100)
        cb()
      })
      blockFor(50)
    }
  })

  test('setTimeout cutoff', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      attrs: {
        custom: {
          outer: true,
          included: true,
          custom: true
        }
      },
      children: [{
        type: 'customTracer',
        children: [],
        attrs: {
          name: 'custom-long-timer'
        }
      }]
    })

    expect(spaAggregate.state.currentNode?.id).toBeFalsy()
    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      setTimeout(function () {
        newrelic.interaction().command('setAttribute', undefined, 'outer', true)
        setTimeout(function () {
          newrelic.interaction().command('setAttribute', undefined, 'excluded', true)
        }, 999)

        setTimeout(newrelic.interaction().createTracer('custom-long-timer', function () {
          newrelic.interaction().command('setAttribute', undefined, 'custom', true)
          cb()
        }), 10)

        setTimeout(function () {
          newrelic.interaction().command('setAttribute', undefined, 'included', true)
        }, 1)
      }, 0)
    }
  })

  test('multiple setTimeout', done => {
    const validator = new helpers.InteractionValidator({
      name: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }, {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    expect(spaAggregate.state.currentNode?.id).toBeFalsy()
    helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done), { baseEE: ee.get(agentIdentifier) })

    function onInteractionStart (cb) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        setTimeout(newrelic.interaction().createTracer('timer', cb))
      }))
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    }
  })
})

function afterInteractionDone (spaAggregate, validator, done, interaction) {
  expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
  expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
  validator.validate(interaction)
  done()
}

function blockFor (ms) {
  const start = performance.now()
  let data = 0
  // eslint-disable-next-line no-unused-vars
  while (performance.now() - start <= ms) data ^= start
}
