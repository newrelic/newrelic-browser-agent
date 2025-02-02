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
