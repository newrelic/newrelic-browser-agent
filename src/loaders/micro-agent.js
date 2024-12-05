import { warn } from '../common/util/console'

export class MicroAgent {
  constructor (opts) {
    if (!window?.newrelic || !window?.newrelic.register) warn(35)
    else {
      try {
        Object.assign(this, window.newrelic.register(opts) || {})
      } catch (err) {
        warn(48, err)
      }
    }
  }
}
