import { getPolyfills } from './polyfill-detection.es5'

afterEach(() => {
  jest.resetAllMocks()
})

test('should always return an empty array', () => {
  const originalFn = Array.from
  Array.from = jest.fn(function (...args) {
    return originalFn.apply(this, args)
  })

  expect(getPolyfills()).toEqual([])

  Array.from = originalFn
})
