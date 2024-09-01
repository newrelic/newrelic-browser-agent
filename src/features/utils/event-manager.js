import { EventBuffer } from './event-buffer'

export class EventManager {
  #buffers = {}

  /** getter without a setter to prevent features from ruining the buffer set accidentally */
  get buffers () {
    return this.#buffers
  }

  reset () {
    for (const featureName in this.#buffers) delete this.#buffers[featureName]
  }

  createBuffer (feature, maxPayloadSize) {
    this.buffers[feature] ??= new EventBuffer(maxPayloadSize)
    return this.#buffers[feature]
  }
}
