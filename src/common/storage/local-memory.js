export class LocalMemory {
  constructor (initialState = {}) {
    this.state = initialState
  }

  get (key) {
    try {
      return this.state[key]
    } catch (err) {
      return ''
    }
  }

  set (key, value) {
    try {
      if (value === undefined || value === null) return this.remove(key)
      this.state[key] = value
    } catch (err) {
      return
    }
  }

  remove (key) {
    try {
      delete this.state[key]
    } catch (err) {
      return
    }
  }
}
