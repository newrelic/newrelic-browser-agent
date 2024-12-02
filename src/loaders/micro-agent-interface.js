import { warn } from '../common/util/console'

export class MicroAgentInterface {
  initialized = false
  constructor (opts) {
    if (!window?.newrelic || !window?.newrelic.register) warn(35)
    else {
      try {
        const registered = window.newrelic.register(opts)
        Object.assign(this, registered?.api || {})
      } catch (err) {
        warn(48, err)
      }
    }
  }
}
