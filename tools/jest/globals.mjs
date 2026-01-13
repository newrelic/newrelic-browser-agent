global.__webpack_require__ = {}

if (typeof window !== 'undefined') {
  window.fetch = jest.fn(() => Promise.resolve())
  window.Request = jest.fn()
  window.Response = jest.fn()
}

/** silence unneeded console debug (warn(...)) noise during tests */
if (typeof console !== 'undefined') {
  console.error = jest.fn()
  console.debug = jest.fn()
}

jest.retryTimes(3)
