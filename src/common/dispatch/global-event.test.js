import { dispatchGlobalEvent } from './global-event'

let globalScope, handler

describe('dispatchGlobalEvent', () => {
  beforeEach(async () => {
    globalScope = (await import('../../common/constants/runtime')).globalScope
  })
  afterEach(() => {
    jest.resetAllMocks()
    globalScope.removeEventListener('newrelic', handler)
  })

  const cases = [
    { loaded: true, agentIdentifier: '1234' },
    {},
    undefined
  ]
  cases.forEach(expected => {
    test('should dispatch loaded event with ' + JSON.stringify(expected), () => {
      const outcome = expected || {} // undefined falls back to an object
      handler = ({ detail }) => {
        expect(detail).toEqual(outcome)
      }
      globalScope.addEventListener('newrelic', handler)
      dispatchGlobalEvent(expected)
    })
  })

  test('unsupported does not emit event and does not cause error', (done) => {
    const origCustomEvent = global.CustomEvent
    global.CustomEvent = jest.fn(() => { throw new Error('test') })
    handler = ({ detail }) => {
      expect(1).toEqual(2) // fail if it calls this
    }
    globalScope.addEventListener('newrelic', handler)
    dispatchGlobalEvent()
    setTimeout(() => {
      done()
    }, 1000)
    global.CustomEvent = origCustomEvent
  })
})
