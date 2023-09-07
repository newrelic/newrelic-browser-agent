import { Timer } from './timer'

jest.useFakeTimers()

let now

beforeEach(() => {
  now = Date.now()
  jest.setSystemTime(now)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('constructor', () => {
  test('appropriate properties are set with valid values -- no refresh', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    const requiredKeys = ['onEnd', 'initialMs', 'startTimestamp', 'timer']
    expect(requiredKeys.every(rk => !!timer[rk])).toBeTruthy()
  })

  test('appropriate properties are set with valid values -- with refresh', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    const requiredKeys = ['onEnd', 'initialMs', 'startTimestamp', 'timer']
    expect(requiredKeys.every(rk => !!timer[rk])).toBeTruthy()
  })

  test('required keys are enforced', () => {
    try {
      new Timer({}, 100)
    } catch (e) {
      expect(e).toEqual(new Error('onEnd handler is required'))
    }

    try {
      new Timer({ onEnd: jest.fn() })
    } catch (e) {
      expect(e).toEqual(new Error('ms duration is required'))
    }
  })
})

describe('create()', () => {
  test('Create sets a timeout that can execute a cb', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    expect(timer.timer).toBeTruthy()
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    jest.runOnlyPendingTimers()
    expect(timer.onEnd).toHaveBeenCalledTimes(1)
  })

  test('Create can fallback to use defaults', () => {
    const timer1 = new Timer({ onEnd: jest.fn() }, 100)
    timer1.create()

    const timer2 = new Timer({ onEnd: jest.fn() }, 100)
    timer2.create(timer2.onEnd)

    const timer3 = new Timer({ onEnd: jest.fn() }, 100)
    timer3.create(undefined, 100)

    jest.runAllTimers(200)

    expect(timer1.onEnd).toHaveBeenCalledTimes(1)
    expect(timer2.onEnd).toHaveBeenCalledTimes(1)
    expect(timer3.onEnd).toHaveBeenCalledTimes(1)
  })
})

describe('clear()', () => {
  test('clear prevents the callback from firing and deletes the pointer', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.clear()
    jest.advanceTimersByTime(150)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    expect(timer.timer).toEqual(null)
  })
})

describe('end()', () => {
  test('end clears the callback and calls the onEnd callback', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.end()
    expect(timer.onEnd).toHaveBeenCalledTimes(1)
    expect(timer.timer).toEqual(null)
  })
})

describe('isValid', () => {
  test('isValid validates timeStamps', () => {
    const timer = new Timer({ onEnd: jest.fn() }, 100)
    expect(timer.isValid()).toEqual(true)
    timer.startTimestamp -= 100
    expect(timer.isValid()).toEqual(false)
  })
})
