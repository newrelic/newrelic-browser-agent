import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Spa } from '../../../src/features/spa'
import { registerHandler } from '../../../src/common/event-emitter/register-handler'
import { drain } from '../../../src/common/drain/drain'

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

let spaInstrument
const agentIdentifier = 'abcdefg'

beforeAll(async () => {
  const aggregator = new Aggregator({ agentIdentifier, ee })
  spaInstrument = new Spa(agentIdentifier, aggregator, false)
})

describe('SPA instrument', () => {
  test('buffers all expected events', done => {
    const events = {
      base: ['fn-start', 'fn-end', 'xhr-resolved'],
      events: ['fn-start'],
      timer: ['setTimeout-end', 'clearTimeout-start', 'fn-start'],
      xhr: ['fn-start', 'new-xhr', 'send-xhr-start'],
      fetch: ['fetch-start', 'fetch-done'],
      history: ['newURL'],
      mutation: ['fn-start'],
      promise: ['propagate', 'cb-start', 'cb-end', 'executor-err', 'resolve-start'],
      tracer: ['fn-start', 'no-fn-start']
    }
    const args = [{
      addEventListener: () => null,
      1: () => null
    }, {
      addEventListener: () => null,
      clone: () => {
        return {
          arrayBuffer: () => {
            return {
              then: () => null
            }
          }
        }
      }
    }, {
      then: () => null
    }]

    expect.hasAssertions() // ensure the handlers below are called by drain
    Object.keys(events).forEach((key) => {
      const eventNames = events[key]
      const emitter = key === 'base' ? spaInstrument.ee : spaInstrument.ee.get(key)

      eventNames.forEach((evName) => {
        const ctx = spaInstrument.ee.context()
        emitter.emit(evName, args, ctx)
        registerHandler(evName, function (a, b) {
          // filter out non test events
          if (this !== ctx) return
          expect(a).toBe(args[0])
          expect(b).toBe(args[1])
        }, 'spa', emitter)
      })
    })
    setTimeout(() => {
      drain(agentIdentifier, 'spa')
      done()
    })
  })
})
