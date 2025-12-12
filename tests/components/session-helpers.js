export class LocalMemory {
  constructor (initialState = {}) {
    this.state = initialState
  }

  get (key) {
    try {
      return this.state[key]
    } catch (err) {
      // Error is ignored
      return ''
    }
  }

  set (key, value) {
    try {
      if (value === undefined) return this.remove(key)
      this.state[key] = value
    } catch (err) {
      // Error is ignored
    }
  }

  remove (key) {
    try {
      delete this.state[key]
    } catch (err) {
      // Error is ignored
    }
  }
}
export const model = {
  value: '',
  inactiveAt: 0,
  expiresAt: 0,
  updatedAt: Date.now(),
  sessionReplayMode: 0,
  sessionReplaySentFirstChunk: false,
  sessionTraceMode: 0,
  traceHarvestStarted: false,
  loggingMode: 0,
  logApiMode: 0,
  serverTimeDiff: null,
  custom: {},
  numOfResets: 0,
  consent: false
}
