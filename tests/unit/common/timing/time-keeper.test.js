import { faker } from '@faker-js/faker'
import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { originTime } from '../../../../src/common/constants/runtime'
import * as configModule from '../../../../src/common/config/config'
import * as eventEmitterModule from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/common/timing/time-keeper')
jest.mock('../../../../src/common/constants/runtime', () => ({
  __esModule: true,
  originTime: 1706213058000
}))

const startTime = 450
const endTime = 600

let agentIdentifier
let eventEmitter
let session
let serverTime
let timeKeeper

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  eventEmitter = {
    on: jest.fn()
  }
  session = {
    read: jest.fn(),
    write: jest.fn()
  }
  serverTime = 1706213061000

  jest.useFakeTimers({
    now: originTime
  })
  jest.spyOn(configModule, 'getRuntime').mockImplementation(() => ({
    session
  }))
  jest.spyOn(eventEmitterModule.ee, 'get').mockReturnValue(eventEmitter)

  window.performance.timeOrigin = Date.now()

  timeKeeper = new TimeKeeper(agentIdentifier)
})

describe('processRumRequest', () => {
  test('should calculate an older corrected page origin', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  test('should calculate a newer corrected page origin', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213055475)
  })

  test.each([undefined, null, 0])('should fallback to unprotected time values when responseStart is %s', (responseStart) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  test.each([null, undefined])('should throw an error when rumRequest is %s', (rumRequest) => {
    expect(() => timeKeeper.processRumRequest(rumRequest, startTime, endTime))
      .toThrowError()
  })

  test.each([null, undefined])('should throw an error when date header is %s', (dateHeader) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => dateHeader)
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })

  test('should throw an error when date header retrieval throws an error', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => { throw new Error('test error') })
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })

  test('should throw an error when correctedOriginTime is NaN', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => serverTime)
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })
})

describe('corrected time calculations', () => {
  test('should convert a relative time to a corrected timestamp - local behind server', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const relativeTimeA = 225
    const correctedRelativeTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(correctedRelativeTimeA).toEqual(1706213060700)

    const relativeTimeB = 1325
    const correctedRelativeTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(correctedRelativeTimeB).toEqual(1706213061800)
  })

  test('should convert a relative time to a corrected timestamp - local ahead server', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const relativeTimeA = 225
    const correctedRelativeTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(correctedRelativeTimeA).toEqual(1706213055700)

    const relativeTimeB = 1325
    const correctedRelativeTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(correctedRelativeTimeB).toEqual(1706213056800)
  })

  test('should correct an absolute timestamp - local behind server', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const absoluteTimeA = 1706213058225
    const correctedAbsoluteTimeA = timeKeeper.correctAbsoluteTimestamp(absoluteTimeA)
    expect(correctedAbsoluteTimeA).toEqual(1706213060700)

    const absoluteTimeB = 1706213059325
    const correctedAbsoluteTimeB = timeKeeper.correctAbsoluteTimestamp(absoluteTimeB)
    expect(correctedAbsoluteTimeB).toEqual(1706213061800)
  })

  test('should correct an absolute timestamp - local ahead server', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const absoluteTimeA = 1706213058225
    const correctedAbsoluteTimeA = timeKeeper.correctAbsoluteTimestamp(absoluteTimeA)
    expect(correctedAbsoluteTimeA).toEqual(1706213055700)

    const absoluteTimeB = 1706213059325
    const correctedAbsoluteTimeB = timeKeeper.correctAbsoluteTimestamp(absoluteTimeB)
    expect(correctedAbsoluteTimeB).toEqual(1706213056800)
  })
})

describe('session entity integration', () => {
  let secondaryEE

  beforeEach(() => {
    secondaryEE = {
      on: jest.fn()
    }

    jest.spyOn(eventEmitterModule.ee, 'get').mockReturnValue(secondaryEE)
  })

  test('should convert a relative time to a corrected timestamp using session - local behind server', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: -2475
    }))

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const relativeTimeA = 225
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeA)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeA))

    const relativeTimeB = 1325
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeB)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeB))
  })

  test('should convert a relative time to a corrected timestamp using session - local ahead server', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: 2525
    }))
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const relativeTimeA = 225
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeA)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeA))

    const relativeTimeB = 1325
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeB)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeB))
  })

  test('should correct an absolute timestamp using session - local behind server', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: -2475
    }))

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const absoluteTimeA = 1706213058225
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeA)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeA))

    const absoluteTimeB = 1706213059325
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeB)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeB))
  })

  test('should correct an absolute timestamp using session - local ahead server', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: 2525
    }))
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    const absoluteTimeA = 1706213058225
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeA)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeA))

    const absoluteTimeB = 1706213059325
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeB)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeB))
  })

  test('should not process rum request when server time diff retrieved from session', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: 2525
    }))

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(true)

    sessionTimeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(mockRumRequest.getResponseHeader).not.toHaveBeenCalled()
  })

  test('should write the calculated server time diff to the session - local behind server', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(false)

    sessionTimeKeeper.processRumRequest(mockRumRequest, startTime, endTime)
    expect(sessionTimeKeeper.ready).toEqual(true)

    expect(session.write).toHaveBeenCalledWith({ serverTimeDiff: -2475 })
  })

  test('should write the calculated server time diff to the session - local ahead server', () => {
    serverTime = 1706213056000
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(false)

    sessionTimeKeeper.processRumRequest(mockRumRequest, startTime, endTime)
    expect(sessionTimeKeeper.ready).toEqual(true)

    expect(session.write).toHaveBeenCalledWith({ serverTimeDiff: 2525 })
  })

  test('should not try saving server diff time before time keeper ready', () => {
    const sessionTimeKeeper = new TimeKeeper(agentIdentifier)
    expect(sessionTimeKeeper.ready).toEqual(false)

    expect(session.write).not.toHaveBeenCalled()
  })
})
