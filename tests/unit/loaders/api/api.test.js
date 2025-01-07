import { faker } from '@faker-js/faker'
import { setTopLevelCallers } from '../../../../src/loaders/api/api'
import { gosCDN } from '../../../../src/common/window/nreum'

jest.enableAutomock()
jest.unmock('../../../../src/loaders/api/api')
jest.unmock('../../../../src/loaders/api/api-methods')

describe('setTopLevelCallers', () => {
  test('should add expected api methods to global NREUM', () => {
    setTopLevelCallers()

    const nreum = gosCDN()
    expect(Object.keys(nreum).length).toEqual(18)
    expect(typeof nreum.setErrorHandler).toEqual('function')
    expect(typeof nreum.finished).toEqual('function')
    expect(typeof nreum.addToTrace).toEqual('function')
    expect(typeof nreum.addRelease).toEqual('function')
    expect(typeof nreum.addPageAction).toEqual('function')
    expect(typeof nreum.recordCustomEvent).toEqual('function')
    expect(typeof nreum.setCurrentRouteName).toEqual('function')
    expect(typeof nreum.setPageViewName).toEqual('function')
    expect(typeof nreum.setCustomAttribute).toEqual('function')
    expect(typeof nreum.interaction).toEqual('function')
    expect(typeof nreum.noticeError).toEqual('function')
    expect(typeof nreum.setUserId).toEqual('function')
    expect(typeof nreum.setApplicationVersion).toEqual('function')
    expect(typeof nreum.start).toEqual('function')
    expect(typeof nreum.recordReplay).toEqual('function')
    expect(typeof nreum.pauseReplay).toEqual('function')
    expect(typeof nreum.log).toEqual('function')
    expect(typeof nreum.wrapLogger).toEqual('function')
    expect(typeof nreum.register).toEqual('function')
  })

  test('should forward calls to initialized and exposed agents', () => {
    setTopLevelCallers()

    const nreum = gosCDN()
    nreum.initializedAgents = {
      [faker.string.uuid()]: {
        exposed: true,
        api: {
          setErrorHandler: jest.fn()
        }
      },
      [faker.string.uuid()]: {
        exposed: true,
        api: {
          setErrorHandler: jest.fn()
        }
      },
      [faker.string.uuid()]: {
        exposed: false,
        api: {
          setErrorHandler: jest.fn()
        }
      }
    }

    const errorHandler = jest.fn()
    nreum.setErrorHandler(errorHandler)

    Object.values(nreum.initializedAgents).forEach(agent => {
      if (agent.exposed) {
        expect(agent.api.setErrorHandler).toHaveBeenCalledTimes(1)
        expect(agent.api.setErrorHandler).toHaveBeenCalledWith(errorHandler)
      } else {
        expect(agent.api.setErrorHandler).not.toHaveBeenCalled()
      }
    })
  })

  test('should return a single value when only one exposed agent returns a value', () => {
    setTopLevelCallers()

    const nreum = gosCDN()
    const expected = faker.string.uuid()
    nreum.initializedAgents = {
      [faker.string.uuid()]: {
        exposed: true,
        api: {
          interaction: jest.fn().mockReturnValue(expected)
        }
      },
      [faker.string.uuid()]: {
        exposed: false,
        api: {
          interaction: jest.fn().mockReturnValue(expected)
        }
      }
    }

    const result = nreum.interaction()
    expect(result).toEqual(expected)
  })

  test('should return an array of values for each exposed agent that returns a value', () => {
    setTopLevelCallers()

    const nreum = gosCDN()
    const expected = faker.string.uuid()
    nreum.initializedAgents = {
      [faker.string.uuid()]: {
        exposed: true,
        api: {
          interaction: jest.fn().mockReturnValue(expected)
        }
      },
      [faker.string.uuid()]: {
        exposed: true,
        api: {
          interaction: jest.fn().mockReturnValue(expected)
        }
      },
      [faker.string.uuid()]: {
        exposed: false,
        api: {
          interaction: jest.fn().mockReturnValue(expected)
        }
      }
    }

    const result = nreum.interaction()
    expect(result).toEqual([expected, expected])
  })
})
