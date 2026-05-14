import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { originTime } from '../../../../src/common/constants/runtime'
import * as eventEmitterModule from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/common/timing/time-keeper')
jest.mock('../../../../src/common/constants/runtime', () => ({
  __esModule: true,
  originTime: 1706213058000
}))

const startTime = 450
const endTime = 600

let eventEmitter
let session
let serverTime
let timeKeeper

beforeEach(() => {
  eventEmitter = {
    on: jest.fn()
  }
  session = {
    read: jest.fn(),
    write: jest.fn(),
    agentRef: {
      ee: eventEmitter
    }
  }
  serverTime = 1706213061000

  jest.useFakeTimers({
    now: originTime
  })
  jest.spyOn(eventEmitterModule.ee, 'get').mockReturnValue(eventEmitter)

  window.performance.timeOrigin = Date.now()

  timeKeeper = new TimeKeeper(session)
})

describe('processRumRequest', () => {
  test('should calculate an older corrected page origin', () => {
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  test('should calculate a newer corrected page origin', () => {
    serverTime = 1706213056000

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213055475)
  })

  test.each([undefined, null, 0])('should fallback to unprotected time values when responseStart is %s', (responseStart) => {
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  test.each([null, undefined])('should throw an error when rumRequest is %s and no timestamp in body', (rumRequest) => {
    expect(() => timeKeeper.processRumRequest(rumRequest, startTime, endTime))
      .toThrowError()
    expect(timeKeeper.ready).toEqual(false)
  })

  test('should throw an error when correctedOriginTime is NaN', () => {
    expect(() => timeKeeper.processRumRequest({}, startTime, endTime, 'bad'))
      .toThrowError()
    expect(timeKeeper.ready).toEqual(false)
  })
})

describe('convertRelativeTimestamp', () => {
  test('should convert a relative time to an absolute timestamp - local behind server', () => {
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const relativeTimeA = 225
    const convertedAbsoluteTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(convertedAbsoluteTimeA).toEqual(1706213058225)

    const relativeTimeB = 1325
    const convertedAbsoluteTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(convertedAbsoluteTimeB).toEqual(1706213059325)
  })

  test('should convert a relative time to an absolute timestamp - local ahead server', () => {
    serverTime = 1706213056000

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const relativeTimeA = 225
    const convertedAbsoluteTimeA = timeKeeper.convertRelativeTimestamp(relativeTimeA)
    expect(convertedAbsoluteTimeA).toEqual(1706213058225)

    const relativeTimeB = 1325
    const convertedAbsoluteTimeB = timeKeeper.convertRelativeTimestamp(relativeTimeB)
    expect(convertedAbsoluteTimeB).toEqual(1706213059325)
  })
})

describe('convertAbsoluteTimestamp', () => {
  test('should convert an absolute timestamp to a relative timestamp - local behind server', () => {
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const absoluteTimeA = 1706213058225
    const convertedRelativeTimeA = timeKeeper.convertAbsoluteTimestamp(absoluteTimeA)
    expect(convertedRelativeTimeA).toEqual(225)

    const absoluteTimeB = 1706213059325
    const convertedAbsoluteTimeB = timeKeeper.convertAbsoluteTimestamp(absoluteTimeB)
    expect(convertedAbsoluteTimeB).toEqual(1325)
  })

  test('should convert an absolute timestamp to a relative timestamp - local ahead server', () => {
    serverTime = 1706213056000

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const absoluteTimeA = 1706213058225
    const convertedRelativeTimeA = timeKeeper.convertAbsoluteTimestamp(absoluteTimeA)
    expect(convertedRelativeTimeA).toEqual(225)

    const absoluteTimeB = 1706213059325
    const convertedAbsoluteTimeB = timeKeeper.convertAbsoluteTimestamp(absoluteTimeB)
    expect(convertedAbsoluteTimeB).toEqual(1325)
  })
})

describe('correctAbsoluteTimestamp', () => {
  test('should correct an absolute timestamp - local behind server', () => {
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const absoluteTimeA = 1706213058225
    const correctedAbsoluteTimeA = timeKeeper.correctAbsoluteTimestamp(absoluteTimeA)
    expect(correctedAbsoluteTimeA).toEqual(1706213060700)

    const absoluteTimeB = 1706213059325
    const correctedAbsoluteTimeB = timeKeeper.correctAbsoluteTimestamp(absoluteTimeB)
    expect(correctedAbsoluteTimeB).toEqual(1706213061800)
  })

  test('should correct an absolute timestamp - local ahead server', () => {
    serverTime = 1706213056000

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

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

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

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

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const relativeTimeA = 225
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeA)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeA))

    const relativeTimeB = 1325
    expect(sessionTimeKeeper.convertRelativeTimestamp(relativeTimeB)).toEqual(timeKeeper.convertRelativeTimestamp(relativeTimeB))
  })

  test('should correct an absolute timestamp using session - local behind server', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: -2475
    }))

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

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

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(true)

    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)

    const absoluteTimeA = 1706213058225
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeA)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeA))

    const absoluteTimeB = 1706213059325
    expect(sessionTimeKeeper.correctAbsoluteTimestamp(absoluteTimeB)).toEqual(timeKeeper.correctAbsoluteTimestamp(absoluteTimeB))
  })

  test('should not process rum request when server time diff retrieved from session', () => {
    jest.spyOn(session, 'read').mockImplementation(() => ({
      serverTimeDiff: 2525
    }))

    const sessionWriteSpy = jest.spyOn(session, 'write')

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(true)

    sessionTimeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)
    expect(sessionWriteSpy).not.toHaveBeenCalledWith({ serverTimeDiff: expect.any(Number) })
  })

  test('should write the calculated server time diff to the session - local behind server', () => {
    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(false)

    sessionTimeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)
    expect(sessionTimeKeeper.ready).toEqual(true)

    expect(session.write).toHaveBeenCalledWith({ serverTimeDiff: -2475 })
  })

  test('should write the calculated server time diff to the session - local ahead server', () => {
    serverTime = 1706213056000

    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(false)

    sessionTimeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)
    expect(sessionTimeKeeper.ready).toEqual(true)

    expect(session.write).toHaveBeenCalledWith({ serverTimeDiff: 2525 })
  })

  test('should not try saving server diff time before time keeper ready', () => {
    const sessionTimeKeeper = new TimeKeeper(session)
    expect(sessionTimeKeeper.ready).toEqual(false)

    expect(session.write).not.toHaveBeenCalled()
  })
})

describe('clock drift detection and correction', () => {
  let mockPerformanceNow
  let mockDateNow
  let handleModule

  beforeEach(() => {
    // Use real timers for drift detection tests
    jest.useRealTimers()

    mockPerformanceNow = jest.spyOn(performance, 'now')
    mockDateNow = jest.spyOn(Date, 'now')

    // Mock the handle module
    handleModule = require('../../../../src/common/event-emitter/handle')
    jest.spyOn(handleModule, 'handle').mockImplementation(() => {})

    // Setup TimeKeeper with server time
    timeKeeper.processRumRequest({}, startTime, endTime, new Date(serverTime) - 0)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useFakeTimers({ now: originTime })
  })

  test('should detect drift when performance.now() falls behind Date.now()', () => {
    // Initially no drift
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 1000)

    timeKeeper.convertRelativeTimestamp(1000)
    expect(handleModule.handle).not.toHaveBeenCalled()

    // Simulate 2-second drift (performance.now frozen while Date.now advanced)
    mockPerformanceNow.mockReturnValue(1000) // Frozen at 1000
    mockDateNow.mockReturnValue(originTime + 3000) // Advanced 2000ms more

    timeKeeper.convertRelativeTimestamp(1000)

    // Should detect drift
    expect(handleModule.handle).toHaveBeenCalledWith(
      expect.any(String),
      ['Generic/TimeKeeper/ClockDrift/Detected', 2000],
      undefined,
      expect.any(String),
      expect.anything()
    )
  })

  test('should NOT detect drift below 1000ms threshold', () => {
    // Small drift under threshold
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 1500) // Only 500ms drift

    timeKeeper.convertRelativeTimestamp(1000)

    expect(handleModule.handle).not.toHaveBeenCalled()
  })

  test('should NOT apply correction when performance.now() is ahead of Date.now()', () => {
    // Simulate negative drift - performance ahead of Date (unusual scenario)
    mockPerformanceNow.mockReturnValue(5000)
    mockDateNow.mockReturnValue(originTime + 2000) // Date is behind performance

    timeKeeper.convertRelativeTimestamp(5000)

    // Should NOT detect drift (we only detect positive drift)
    expect(handleModule.handle).not.toHaveBeenCalled()

    // Timestamp should be converted without any drift correction
    const convertedTimestamp = timeKeeper.convertRelativeTimestamp(5000)
    expect(convertedTimestamp).toEqual(originTime + 5000) // No drift adjustment
  })

  test('should correct timestamps after drift is detected', () => {
    // Initially no drift
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 1000)

    const beforeDriftTimestamp = timeKeeper.convertRelativeTimestamp(1000)
    expect(beforeDriftTimestamp).toEqual(originTime + 1000)

    // Simulate 2-second drift
    mockPerformanceNow.mockReturnValue(1000) // Frozen
    mockDateNow.mockReturnValue(originTime + 3000) // Advanced 2000ms

    const afterDriftTimestamp = timeKeeper.convertRelativeTimestamp(1000)
    // Should add the 2000ms drift correction
    expect(afterDriftTimestamp).toEqual(originTime + 1000 + 2000)
  })

  test('should correct convertAbsoluteTimestamp after drift is detected', () => {
    // Simulate 2-second drift
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 3000)

    // Trigger drift detection
    timeKeeper.convertRelativeTimestamp(1000)

    // Convert absolute back to relative - should subtract the drift
    const absoluteTime = originTime + 3000
    const relativeTime = timeKeeper.convertAbsoluteTimestamp(absoluteTime)

    // Should return approximately performance.now() (1000ms)
    expect(relativeTime).toEqual(1000)
  })

  test('should handle multiple drift events cumulatively', () => {
    // First drift event: 2 seconds
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 3000)

    timeKeeper.convertRelativeTimestamp(1000)
    expect(handleModule.handle).toHaveBeenCalledWith(
      expect.any(String),
      ['Generic/TimeKeeper/ClockDrift/Detected', 2000],
      undefined,
      expect.any(String),
      expect.anything()
    )

    const afterFirstDrift = timeKeeper.convertRelativeTimestamp(1000)
    expect(afterFirstDrift).toEqual(originTime + 3000)

    // Second drift event: another 1.5 seconds (cumulative 3.5s total)
    mockPerformanceNow.mockReturnValue(1000) // Still frozen
    mockDateNow.mockReturnValue(originTime + 4500)

    timeKeeper.convertRelativeTimestamp(1000)

    // Should detect the new drift (increase of 1500ms)
    expect(handleModule.handle).toHaveBeenCalledWith(
      expect.any(String),
      ['Generic/TimeKeeper/ClockDrift/Detected', 3500],
      undefined,
      expect.any(String),
      expect.anything()
    )

    const afterSecondDrift = timeKeeper.convertRelativeTimestamp(1000)
    expect(afterSecondDrift).toEqual(originTime + 4500)
  })

  test('should NOT report same drift multiple times', () => {
    // Simulate drift
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 3000)

    timeKeeper.convertRelativeTimestamp(1000)
    expect(handleModule.handle).toHaveBeenCalledTimes(1)

    // Call again with same drift - should not report again
    timeKeeper.convertRelativeTimestamp(1000)
    expect(handleModule.handle).toHaveBeenCalledTimes(1) // Still only 1 call
  })

  test('should apply drift correction to correctRelativeTimestamp', () => {
    // Simulate drift
    mockPerformanceNow.mockReturnValue(1000)
    mockDateNow.mockReturnValue(originTime + 3000)

    const correctedTimestamp = timeKeeper.correctRelativeTimestamp(1000)

    // Should convert relative to absolute (with drift), then correct to server time
    // convertRelativeTimestamp(1000) = originTime + 1000 + 2000 (drift)
    // correctAbsoluteTimestamp applies server offset on top of that
    const expectedServerCorrected = originTime + 3000 - timeKeeper.localTimeDiff
    expect(correctedTimestamp).toEqual(expectedServerCorrected)
  })
})
