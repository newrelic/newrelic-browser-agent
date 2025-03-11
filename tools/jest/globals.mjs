global.__webpack_require__ = {}

if (typeof window !== 'undefined') {
  window.fetch = jest.fn(() => Promise.resolve())
  window.Request = jest.fn()
  window.Response = jest.fn()
}

Object.defineProperty(global.performance, 'getEntriesByType', {
  value: jest.fn(entryType => ([
    {
      cancelable: true,
      duration: 17,
      entryType,
      name: 'pointer',
      processingEnd: 8860,
      processingStart: 8859,
      startTime: 8853,
      target: { tagName: 'button' }
    }
  ]))
})

jest.retryTimes(3)
