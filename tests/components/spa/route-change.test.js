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

test('setCurrentRouteName', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      oldRoute: 'test start',
      newRoute: 'in test interaction'
    },
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('in test interaction')
    cb()
  }
})

test('interaction is not a route change if it does not change the url while route name is null', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName(null)
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    cb()
  }
})

test('interaction is not a route change if it does not change url or route', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    cb()
  }
})

test('url change is a route change when route name is set', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, true), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    window.location.hash = Math.random()
    cb()
  }
})

test('replacestate is a route change when route name is set', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, true), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    const prevLocation = window.location.pathname + window.location.search + window.location.hash
    window.history.replaceState(null, 'test', '/something-else')
    window.history.replaceState(null, 'test', prevLocation)
    cb()
  }
})

test('setting route to null does not count as a route change', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName(null)
    cb()
  }
})

test('changing the url when route name is null counts as a route change', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName(null)
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, true), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    window.location.hash = Math.random()
    cb()
  }
})

test('resetting the route to the same routename does not count as a route change', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('test start')
    cb()
  }
})

test('changing route, and changing back to original is not a route change', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName('original')
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, false), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('new')
    newrelic.setCurrentRouteName('original')
    cb()
  }
})

test('changing url, and changing back to original is a route change', done => {
  const validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  newrelic.setCurrentRouteName(null)
  window.location.hash = 'original'
  helpers.startInteraction(onInteractionStart, afterInteractionDone.bind(null, spaAggregate, validator, done, true), { baseEE: ee.get(agentIdentifier) })

  function onInteractionStart (cb) {
    window.location.hash = 'new'
    setTimeout(function () {
      window.location.hash = 'original'
    })
    cb()
  }
})

function afterInteractionDone (spaAggregate, validator, done, isRC, interaction) {
  if (isRC) expect(interaction.routeChange).toBeTruthy()
  else expect(interaction.routeChange).toBeFalsy()
  expect(interaction.root.end).toBeGreaterThan(0) // interaction should be finished and have an end time
  expect(spaAggregate.state.currentNode?.id).toBeFalsy() // interaction should be null outside of async chain
  validator.validate(interaction)
  done()
}
