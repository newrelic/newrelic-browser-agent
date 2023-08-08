export class VitalMetric {
  #value
  #roundingMethod = Math.floor
  constructor (name, value, roundingMethod) {
    this.name = name
    this.attrs = {}
    if (typeof roundingMethod === 'function') this.#roundingMethod = roundingMethod
    if (value !== undefined) this.#value = value
  }

  get value () { return this.#roundingMethod(this.#value) }
  set value (v) { this.#value = v }

  get isValid () { return this.value >= 0 }
}

export const waitForVitalMetric = (reporter, cb, repeat = 0) => {
  reporter().then(vitalMetric => {
    cb(vitalMetric)
    if (repeat > 0) waitForVitalMetric(reporter, cb, --repeat)
  })
}

/** takes an attributes object and appends connection attributes if available */
export function addConnectionAttributes (attributes) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection // to date, both window & worker shares the same support for connection
  if (!connection) return

  if (connection.type) attributes['net-type'] = connection.type
  if (connection.effectiveType) attributes['net-etype'] = connection.effectiveType
  if (connection.rtt) attributes['net-rtt'] = connection.rtt
  if (connection.downlink) attributes['net-dlink'] = connection.downlink

  return attributes
}
