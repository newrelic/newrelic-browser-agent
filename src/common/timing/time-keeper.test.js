import { faker } from '@faker-js/faker'
import { globalScope } from '../constants/runtime'
import { TimeKeeper } from './time-keeper'
import * as configModule from '../config/config'

jest.enableAutomock()
jest.unmock('./time-keeper')

let localTime
let serverTime
let mockAgent
let runtimeConfig
let timeKeeper
beforeEach(() => {
  localTime = 1706213058000
  serverTime = 1706213061000

  jest.useFakeTimers({
    now: localTime
  })

  mockAgent = {
    agentIdentifier: faker.string.uuid()
  }
  runtimeConfig = {
    offset: localTime
  }

  jest.spyOn(configModule, 'getRuntime').mockImplementation(() => runtimeConfig)

  timeKeeper = new TimeKeeper(mockAgent)
})

describe('processRumRequest', () => {
  it('should calculate an older corrected page origin', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    expect(timeKeeper.correctedPageOriginTime).toEqual(1706213060475)
  })

  it('should calculate a newer corrected page origin', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    expect(timeKeeper.correctedPageOriginTime).toEqual(1706213055475)
  })

  it.each([undefined, null, 0])('should fallback to unprotected time values when responseStart is %s', (responseStart) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart,
      responseEnd: 600,
      fetchStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    expect(timeKeeper.correctedPageOriginTime).toEqual(1706213060475)
  })

  it.each([null, undefined])('should throw an error when rumRequest is %s', (rumRequest) => {
    const rumRequestUrl = faker.internet.url()

    expect(() => timeKeeper.processRumRequest(rumRequest, rumRequestUrl))
      .toThrowError()
  })

  it.each([null, undefined])('should throw an error when date header is %s', (dateHeader) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => dateHeader)
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })

  it('should throw an error when date header retrieval throws an error', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => { throw new Error('test error') })
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })

  it('should throw an error when getEntriesByName throws error', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    globalScope.performance.getEntriesByName = jest.fn(() => { throw new Error('test error') })

    const timeKeeper = new TimeKeeper(mockAgent)

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })

  it.each([null, undefined, {}])('should throw an error when getEntriesByName returns %s instead of an array', (performanceEntries) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    globalScope.performance.getEntriesByName = jest.fn(() => performanceEntries)

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })

  it('should throw an error when getEntriesByName returns an empty array', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    globalScope.performance.getEntriesByName = jest.fn(() => [])

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })

  it('should throw an error when correctedOriginTime is NaN', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => serverTime)
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    expect(() => timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl))
      .toThrowError()
  })
})

describe('corrected time calculations', () => {
  it('should convert a relative time to a corrected timestamp - local behind server', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    const relativeTimeA = 225
    const correctedRelativeTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(correctedRelativeTimeA).toEqual(1706213060700)

    const relativeTimeB = 1325
    const correctedRelativeTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(correctedRelativeTimeB).toEqual(1706213061800)
  })

  it('should convert a relative time to a corrected timestamp - local ahead server', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    const relativeTimeA = 225
    const correctedRelativeTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(correctedRelativeTimeA).toEqual(1706213055700)

    const relativeTimeB = 1325
    const correctedRelativeTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(correctedRelativeTimeB).toEqual(1706213056800)
  })

  it('should correct an absolute timestamp - local behind server', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    const absoluteTimeA = 1706213058225
    const correctedAbsoluteTimeA = timeKeeper.correctAbsoluteTimestamp(absoluteTimeA)
    expect(correctedAbsoluteTimeA).toEqual(1706213060700)

    const absoluteTimeB = 1706213059325
    const correctedAbsoluteTimeB = timeKeeper.correctAbsoluteTimestamp(absoluteTimeB)
    expect(correctedAbsoluteTimeB).toEqual(1706213061800)
  })

  it('should correct an absolute timestamp - local ahead server', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const rumRequestUrl = faker.internet.url()
    const rumRequestPerformanceEntry = {
      name: rumRequestUrl,
      responseStart: 600,
      requestStart: 450
    }
    globalScope.performance.getEntriesByName = jest.fn(() => [rumRequestPerformanceEntry])

    timeKeeper.processRumRequest(mockRumRequest, rumRequestUrl)

    const absoluteTimeA = 1706213058225
    const correctedAbsoluteTimeA = timeKeeper.correctAbsoluteTimestamp(absoluteTimeA)
    expect(correctedAbsoluteTimeA).toEqual(1706213055700)

    const absoluteTimeB = 1706213059325
    const correctedAbsoluteTimeB = timeKeeper.correctAbsoluteTimestamp(absoluteTimeB)
    expect(correctedAbsoluteTimeB).toEqual(1706213056800)
  })
})
