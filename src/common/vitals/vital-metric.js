export class VitalMetric {
  #values = []
  #roundingMethod = Math.floor
  #subscribers = new Set()
  entries = undefined

  constructor (name, roundingMethod) {
    this.name = name
    this.attrs = {}
    if (typeof roundingMethod === 'function') this.#roundingMethod = roundingMethod
  }

  update ({ value, entries, attrs, addConnectionAttributes = false }) {
    this.#values.push(this.#roundingMethod(value))
    this.entries = entries
    if (attrs) this.attrs = { ...this.attrs, ...attrs }
    if (addConnectionAttributes) this.addConnectionAttributes()
    this.#subscribers.forEach(cb => {
      try {
        cb(this.value)
      } catch (e) {
        // ignore errors
      }
    })
  }

  get value () {
    return {
      previous: this.#values[this.#values.length - 2],
      current: this.#values[this.#values.length - 1],
      name: this.name,
      attrs: this.attrs,
      entries: this.entries
    }
  }

  // set value (v) {
  //   this.#values.push(this.#roundingMethod(v))
  //   this.#subscribers.forEach(cb => {
  //     try {
  //       cb(this.value)
  //     } catch (e) {
  //       // ignore errors
  //     }
  //   })
  // }

  get isValid () {
    return this.value.current >= 0
  }

  subscribe (callback) {
    this.#subscribers.add(callback)
    if (this.isValid) callback(this.value)
    return () => { this.#subscribers.remove(callback) }
  }

  addConnectionAttributes () {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection // to date, both window & worker shares the same support for connection
    if (!connection) return

    if (connection.type) this.attrs['net-type'] = connection.type
    if (connection.effectiveType) this.attrs['net-etype'] = connection.effectiveType
    if (connection.rtt) this.attrs['net-rtt'] = connection.rtt
    if (connection.downlink) this.attrs['net-dlink'] = connection.downlink
  }
}
