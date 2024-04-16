import { TimeKeeper } from '../../../../src/common/timing/time-keeper'
import { originTime } from '../../../../src/common/constants/runtime'

jest.enableAutomock()
jest.unmock('../../../../src/common/timing/time-keeper')
jest.mock('../../../../src/common/constants/runtime', () => ({
  __esModule: true,
  originTime: 1706213058000
}))

const startTime = 450
const endTime = 600

let serverTime
let timeKeeper

beforeEach(() => {
  serverTime = 1706213061000

  jest.useFakeTimers({
    now: originTime
  })

  window.performance.timeOrigin = Date.now()

  timeKeeper = new TimeKeeper()
})

describe('processRumRequest', () => {
  it('should calculate an older corrected page origin', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  it('should calculate a newer corrected page origin', () => {
    serverTime = 1706213056000

    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213055475)
  })

  it.each([undefined, null, 0])('should fallback to unprotected time values when responseStart is %s', (responseStart) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => (new Date(serverTime)).toUTCString())
    }

    timeKeeper.processRumRequest(mockRumRequest, startTime, endTime)

    expect(timeKeeper.correctedOriginTime).toEqual(1706213060475)
  })

  it.each([null, undefined])('should throw an error when rumRequest is %s', (rumRequest) => {
    expect(() => timeKeeper.processRumRequest(rumRequest, startTime, endTime))
      .toThrowError()
  })

  it.each([null, undefined])('should throw an error when date header is %s', (dateHeader) => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => dateHeader)
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })

  it('should throw an error when date header retrieval throws an error', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => { throw new Error('test error') })
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })

  it('should throw an error when correctedOriginTime is NaN', () => {
    const mockRumRequest = {
      getResponseHeader: jest.fn(() => serverTime)
    }

    expect(() => timeKeeper.processRumRequest(mockRumRequest, startTime, endTime))
      .toThrowError()
  })
})

describe('corrected time calculations', () => {
  it('should convert a relative time to a corrected timestamp - local behind server', () => {
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

  it('should convert a relative time to a corrected timestamp - local ahead server', () => {
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

  it('should correct an absolute timestamp - local behind server', () => {
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

  it('should correct an absolute timestamp - local ahead server', () => {
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
