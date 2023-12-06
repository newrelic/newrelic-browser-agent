export const SESSION_EVENTS = {
  PAUSE: 'session-pause',
  RESET: 'session-reset',
  RESUME: 'session-resume'
}

export const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}

export const SessionEntity = jest.fn(function () {
  this.setup = jest.fn()
  this.sync = jest.fn()
  this.read = jest.fn()
  this.write = jest.fn()
  this.reset = jest.fn()
  this.refresh = jest.fn()
  this.isExpired = jest.fn(() => false)
  this.isInvalid = jest.fn(() => false)
  this.collectSM = jest.fn()
  this.getFutureTimestamp = jest.fn()
  this.syncCustomAttribute = jest.fn()

  Object.defineProperty(this, 'lookupKey', {
    configurable: true,
    enumerable: true,
    get: jest.fn()
  })
})
