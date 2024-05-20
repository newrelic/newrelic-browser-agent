export class EventMessenger {
  #subscribers = new Set()
  history = []

  get current () {
    return this.history[this.history.length - 1]
  }

  emit ({ value }) {
    this.history.push(value)
    this.#subscribers.forEach(cb => {
      try {
        cb(this.current)
      } catch (e) {
        // ignore errors
      }
    })
  }

  subscribe (callback, buffered) {
    if (typeof callback !== 'function') return
    this.#subscribers.add(callback)
    // emit full history on subscription ("buffered" behavior)
    if (buffered) this.history.forEach(state => { callback(state) })
    return () => { this.#subscribers.delete(callback) }
  }
}
