import { stringify } from '../../../common/util/stringify'
import { MAX_PAYLOAD_SIZE } from '../constants'

/**
 * A container that keeps an event buffer and size with helper methods
 * @typedef {Object} EventBuffer
 * @property {number} size
 * @property {*[]} buffer
 */

export class EventBuffer {
  constructor () {
    this.bytes = 0
    this.buffer = []
  }

  /**
   * Adds an event object to the buffer while tallying size
   * @param {Object} event the event object to add to the buffer
   * @returns {EventBuffer} returns the event buffer for chaining
   */
  add (event) {
    const size = stringify(event).length
    if (!this.canMerge(size)) return
    this.buffer.push(event)
    this.bytes += size
    return this
  }

  /**
   * Merges an EventBuffer into this EventBuffer
   * @param {EventBuffer} events an EventBuffer intended to merge with this EventBuffer
   * @param {boolean} prepend if true, the supplied events will be prepended before the events of this class
   * @returns {EventBuffer} returns the event buffer for chaining
   */
  merge (eventBuffer, prepend = false) {
    if (!this.canMerge(eventBuffer.bytes)) return
    this.buffer = prepend ? [...eventBuffer.buffer, ...this.buffer] : [...this.buffer, ...eventBuffer.buffer]
    this.bytes = this.bytes + eventBuffer.bytes
    return this
  }

  /**
   * Returns a boolean indicating whether the size and buffer contain valid data
   * @returns {boolean}
   */
  isValid () {
    return this.buffer.length > 0 && this.bytes > 0
  }

  /**
   * Returns a boolean indicating the resulting size of a merge would be valid
   * @param {number} size
   * @returns {boolean}
   */
  canMerge (size) {
    return this.bytes + (size || Infinity) < MAX_PAYLOAD_SIZE
  }
}
