export class VitalMetric {
  #subscribers = new Set()
  history = []

  constructor (name, roundingMethod) {
    this.name = name
    this.attrs = {}
    this.roundingMethod = typeof roundingMethod === 'function' ? roundingMethod : Math.floor
  }

  update ({ value, entries = [], attrs = {}, shouldAddConnectionAttributes = false }) {
    if (value < 0) return
    const state = {
      value: this.roundingMethod(value),
      name: this.name,
      entries,
      attrs
    }
    if (shouldAddConnectionAttributes) addConnectionAttributes(state.attrs)
    this.history.push(state)
    this.#subscribers.forEach(cb => {
      try {
        cb(this.current)
      } catch (e) {
        // ignore errors
      }
    })
  }

  get current () {
    return this.history[this.history.length - 1] || {
      value: undefined,
      name: this.name,
      entries: [],
      attrs: {}
    }
  }

  get isValid () {
    return this.current.value >= 0
  }

  subscribe (callback, buffered = true) {
    if (typeof callback !== 'function') return
    this.#subscribers.add(callback)
    // emit full history on subscription ("buffered" behavior)
    if (this.isValid && !!buffered) this.history.forEach(state => { callback(state) })
    return () => { this.#subscribers.delete(callback) }
  }
}

function addConnectionAttributes (obj) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection // to date, both window & worker shares the same support for connection
  if (!connection) return

  if (connection.type) obj['net-type'] = connection.type
  if (connection.effectiveType) obj['net-etype'] = connection.effectiveType
  if (connection.rtt) obj['net-rtt'] = connection.rtt
  if (connection.downlink) obj['net-dlink'] = connection.downlink
}
