import helpers from './helpers'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa/index'

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  originals: { ST: setTimeout, CT: clearTimeout },
  getRuntime: jest.fn().mockReturnValue({ xhrWrappable: true, origin: global.location.href }),
  isConfigured: jest.fn().mockReturnValue(true),
  getInfo: jest.fn().mockReturnValue({ jsAttributes: {} })
}))

let spaInstrument, spaAggregate, newrelic
const agentIdentifier = 'abcdefg'

beforeAll(async () => {
  global.MockXhr.setup() // replaces the global, or window, XHR object with a mock
  const aggregator = new Aggregator({ agentIdentifier, ee })
  spaInstrument = new Spa(agentIdentifier, aggregator) // wraps the mocked XHR object
  await expect(spaInstrument.onAggregateImported).resolves.toEqual(true)
  spaAggregate = spaInstrument.featAggregate
  spaAggregate.blocked = true
  spaAggregate.drain()
  newrelic = helpers.getNewrelicGlobal(spaAggregate.ee)
})

test('spa aggregator receives complete interaction when hashchange fires after finish', done => {
  const originalUrl = window.location.toString()
  const expected = {
    name: 'interaction',
    attrs: {
      trigger: 'click',
      initialPageURL: originalUrl,
      oldURL: originalUrl,
      newURL: 'placeholder',
      custom: {
        'after-hashchange': true
      }
    },
    children: [{
      name: 'ajax',
      children: []
    }]
  }
  const validator = new helpers.InteractionValidator(expected)

  setTimeout(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone, { baseEE: ee.get(agentIdentifier) })
  })

  function onInteractionStart (cb) {
    let xhr = new XMLHttpRequest()

    xhr.onload = function () {
      window.location.hash = Math.random()
      expected.attrs.newURL = window.location.toString()
    }

    // Validates that async work that is spawned by the hash change
    // will be included in the interaction.
    window.addEventListener('hashchange', function () {
      setTimeout(function () {
        newrelic.interaction().command('setAttribute', undefined, 'after-hashchange', true)
        cb()
      }, 10)
    })

    xhr.open('GET', '/')
    xhr.send()
  }

  function afterInteractionDone (interaction) {
    expect(interaction.root.attrs.newURL).not.toEqual(interaction.root.attrs.oldURL) // old and new URLs should be different
    expect(interaction.root.end).toBeTruthy() // interaction should be finished
    validator.validate(interaction)
    done()
  }
})
