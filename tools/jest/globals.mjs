global.__webpack_require__ = {}

if (typeof window !== 'undefined') {
  window.fetch = jest.fn(() => Promise.resolve())
  window.Request = jest.fn()
  window.Response = jest.fn()
}

jest.retryTimes(3)
