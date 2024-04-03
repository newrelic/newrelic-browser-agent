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
  onload = jest.fn()
  send = jest.fn(() => {
    setTimeout(this.onload, Math.floor(Math.random() * 10))
  })

  setRequestHeader = jest.fn()
  addEventListener = jest.fn()
}
