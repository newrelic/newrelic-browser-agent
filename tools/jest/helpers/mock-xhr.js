export class MockXhr {
  static originalXHR = null

  static setup () {
    MockXhr.originalXHR = window.XMLHttpRequest
    window.XMLHttpRequest = jest.fn(() => new MockXhr())
  }

  static teardown () {
    if (MockXhr.originalXHR) {
      window.XMLHttpRequest = MockXhr.originalXHR
      MockXhr.originalXHR = null
    }
  }

  open = jest.fn()
  send = jest.fn()
  setRequestHeader = jest.fn()
  addEventListener = jest.fn()
}
