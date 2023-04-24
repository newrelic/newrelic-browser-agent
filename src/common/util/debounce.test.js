import { debounce } from './debounce'

jest.useFakeTimers()

test('should run the debounced function after 100ms', () => {
  let mockCallback = jest.fn()

  let debouncedMethod = debounce(mockCallback, 100)
  execFnTimes(debouncedMethod, 100)

  expect(mockCallback).not.toHaveBeenCalled()

  jest.advanceTimersByTime(1000)
  expect(mockCallback).toHaveBeenCalledTimes(1)
})

test('should rerun the debounced function when called again after 100ms', () => {
  let mockCallback = jest.fn()

  let debouncedMethod = debounce(mockCallback, 100)

  execFnTimes(debouncedMethod, 100)
  jest.advanceTimersByTime(200)
  execFnTimes(debouncedMethod, 100)
  jest.advanceTimersByTime(2000)

  expect(mockCallback).toHaveBeenCalledTimes(2)
})

test('should run the callback on the first event and debounce subsequent events', () => {
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

function execFnTimes (fn, count) {
  for (let i = 0; i < count; i++) {
    fn()
  }
}
