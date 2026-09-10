global.__webpack_require__ = {}

if (typeof window !== 'undefined') {
  window.fetch = jest.fn(() => Promise.resolve())
  window.Request = jest.fn()
  window.Response = jest.fn()
}

/** jsdom does not implement the Performance Timeline; web-vitals >= 5 calls this unguarded at metric registration */
if (typeof performance !== 'undefined' && typeof performance.getEntriesByType !== 'function') {
  // writable + configurable so individual tests can still redefine it
  Object.defineProperty(performance, 'getEntriesByType', { value: () => [], writable: true, configurable: true })
}

/** silence unneeded console debug (warn(...)) noise during tests */
if (typeof console !== 'undefined') {
  console.error = jest.fn()
  console.debug = jest.fn()
}
