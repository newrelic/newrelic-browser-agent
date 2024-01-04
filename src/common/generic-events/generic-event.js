import { now } from '../timing/now'

export class GenericEvent {
  timestamp = Date.now()
  timestampOffset = now()

  constructor (event) {
    for (let key in event) this[key] = event[key]
  }
}
