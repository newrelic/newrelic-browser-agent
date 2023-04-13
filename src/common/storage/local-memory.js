export class LocalMemory {
  constructor () {
    this.state = {}
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
      if (!value) this.delete(key)
      this.state[key] = value
    } catch (err) {
      return
    }
  }
  remove (key) {
    try {
      return delete this.state[key]
    } catch (err) {
      return
    }
  }
}
