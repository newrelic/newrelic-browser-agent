import { debounce, single } from './invoke'

jest.useFakeTimers()

describe('debounce', () => {
  test('should run the supplied function after 100ms', () => {
    let mockCallback = jest.fn()

    let debouncedMethod = debounce(mockCallback, 100)
    execFnTimes(debouncedMethod, 100)

    expect(mockCallback).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1000)
    expect(mockCallback).toHaveBeenCalledTimes(1)
  })

  test('should rerun the supplied function when called again after 100ms', () => {
    let mockCallback = jest.fn()

    let debouncedMethod = debounce(mockCallback, 100)

    execFnTimes(debouncedMethod, 100)
    jest.advanceTimersByTime(200)
    execFnTimes(debouncedMethod, 100)
    jest.advanceTimersByTime(2000)

    expect(mockCallback).toHaveBeenCalledTimes(2)
  })

  test('should run the supplied function on the first event and debounce subsequent events', () => {
    let mockCallback = jest.fn()

    let debouncedMethod = debounce(mockCallback, 100, { leading: true })

    execFnTimes(debouncedMethod, 100)
    expect(mockCallback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(200)

    expect(mockCallback).toHaveBeenCalledTimes(1)

    execFnTimes(debouncedMethod, 100)
    jest.advanceTimersByTime(200)

    expect(mockCallback).toHaveBeenCalledTimes(2)
  })
})

describe('single', () => {
  test('should run the supplied function only once', () => {
    let mockCallback = jest.fn()

    let singleMethod = single(mockCallback, 100)
    execFnTimes(singleMethod, 100)

    expect(mockCallback).toHaveBeenCalledTimes(1)
  })
})

function execFnTimes (fn, count) {
  for (let i = 0; i < count; i++) {
    fn()
  }
}
