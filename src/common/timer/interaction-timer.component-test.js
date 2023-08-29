import { InteractionTimer } from './interaction-timer'

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
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    const requiredKeys = ['onEnd', 'initialMs', 'startTimestamp', 'timer']
    expect(requiredKeys.every(rk => !!timer[rk])).toBeTruthy()
  })

  test('appropriate properties are set with valid values -- with refresh', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    const requiredKeys = ['onEnd', 'refresh', 'initialMs', 'startTimestamp', 'timer']
    expect(requiredKeys.every(rk => !!timer[rk])).toBeTruthy()
  })

  test('required keys are enforced', () => {
    try {
      new InteractionTimer({}, 100)
    } catch (e) {
      expect(e).toEqual(new Error('onEnd handler is required'))
    }

    try {
      new InteractionTimer({ onEnd: jest.fn() })
    } catch (e) {
      expect(e).toEqual(new Error('ms duration is required'))
    }
  })

  test('refresh type timers set event listeners', () => {
    // eslint-disable-next-line
    let ee = { on: jest.fn().mockImplementation((evt, cb) => { cb([{ type: 'click' }]) }) }
    let it = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn(), ee }, 100)
    // scroll, keypress, click
    expect(ee.on).toHaveBeenCalledTimes(1)
    expect(it.onRefresh).toHaveBeenCalledTimes(1)

    // eslint-disable-next-line
     ee = { on: jest.fn().mockImplementation((evt, cb) => { cb([{ type: 'scroll' }]) }) }
    it = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn(), ee }, 100)
    // scroll, keypress, click
    expect(ee.on).toHaveBeenCalledTimes(1)
    expect(it.onRefresh).toHaveBeenCalledTimes(1)

    // eslint-disable-next-line
     ee = { on: jest.fn().mockImplementation((evt, cb) => { cb([{ type: 'keydown' }]) }) }
    it = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn(), ee }, 100)
    // scroll, keypress, click
    expect(ee.on).toHaveBeenCalledTimes(1)
    expect(it.onRefresh).toHaveBeenCalledTimes(1)

    const aelSpy = jest.spyOn(document, 'addEventListener')
    // eslint-disable-next-line
    ee = { on: jest.fn().mockImplementation((evt, cb) => { cb([{ type: 'keydown' }]) }) }
    it = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn(), ee }, 100)
    // visibility change
    expect(aelSpy).toHaveBeenCalledTimes(1)
  })
})

describe('create()', () => {
  test('Create sets a timeout that can execute a cb', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.timer).toBeTruthy()
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    jest.runOnlyPendingTimers()
    expect(timer.onEnd).toHaveBeenCalledTimes(1)
  })

  test('Create can fallback to use defaults', () => {
    const timer1 = new InteractionTimer({ onEnd: jest.fn() }, 100)
    timer1.create()

    const timer2 = new InteractionTimer({ onEnd: jest.fn() }, 100)
    timer2.create(timer2.onEnd)

    const timer3 = new InteractionTimer({ onEnd: jest.fn() }, 100)
    timer3.create(undefined, 100)

    jest.runAllTimers(200)

    expect(timer1.onEnd).toHaveBeenCalledTimes(1)
    expect(timer2.onEnd).toHaveBeenCalledTimes(1)
    expect(timer3.onEnd).toHaveBeenCalledTimes(1)
  })
})

describe('refresh()', () => {
  test('refresh prevents the callback from firing', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    jest.advanceTimersByTime(75)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.refresh()
    jest.advanceTimersByTime(75)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    jest.advanceTimersByTime(100)
    expect(timer.onEnd).toHaveBeenCalledTimes(1)
  })

  test('refresh executes a callback for consumers', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn(), onRefresh: jest.fn() }, 100)
    timer.refresh()
    expect(timer.onRefresh).toHaveBeenCalledTimes(1)
  })
})

describe('pause()', () => {
  test('pause prevents the callback from firing', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.pause()
    jest.advanceTimersByTime(150)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
  })

  test('pause sets remainingMs timestamp', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.remainingMs).toEqual(undefined)
    timer.pause()
    expect(timer.remainingMs).toEqual(timer.initialMs - (now - timer.startTimestamp))
  })
})

describe('clear()', () => {
  test('clear prevents the callback from firing and deletes the pointer', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.clear()
    jest.advanceTimersByTime(150)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    expect(timer.timer).toEqual(null)
  })
})

describe('end()', () => {
  test('end clears the callback and calls the onEnd callback', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.onEnd).toHaveBeenCalledTimes(0)
    timer.end()
    expect(timer.onEnd).toHaveBeenCalledTimes(1)
    expect(timer.timer).toEqual(null)
  })
})

describe('isValid', () => {
  test('isValid validates timeStamps', () => {
    const timer = new InteractionTimer({ onEnd: jest.fn() }, 100)
    expect(timer.isValid()).toEqual(true)
    timer.startTimestamp -= 100
    expect(timer.isValid()).toEqual(false)
  })
})
