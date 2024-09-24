import { stringify } from '../../common/util/stringify'
import { MAX_PAYLOAD_SIZE } from '../../common/constants/agent-constants'

/**
 * A container that keeps an event buffer and size with helper methods
 * @typedef {Object} EventBuffer
 * @property {number} size
 * @property {*[]} buffer
 */

/**
 * A container that holds, evaluates, and merges event objects for harvesting
 */
export class EventBuffer {
  /** @type {Object[]} */
  #buffer = []
  /** @type {number} */
  #bytes = 0
  /** @type {EventBuffer} */
  #held

  /**
   *
   * @param {number=} maxPayloadSize
   */
  constructor (maxPayloadSize = MAX_PAYLOAD_SIZE) {
    this.maxPayloadSize = maxPayloadSize
  }

  /**
   * buffer is read only, use the helper methods to add or clear buffer data
   */
  get buffer () {
    return this.#buffer
  }

  /**
   * bytes is read only, use the helper methods to add or clear buffer data
   */
  get bytes () {
    return this.#bytes
  }

  /**
   * held is another event buffer
   */
  get held () {
    if (!this.#held) this.#held = new EventBuffer(this.maxPayloadSize)
    return this.#held
  }

  /**
   * Returns a boolean indicating whether the current size and buffer contain valid data
   * @returns {boolean}
   */
  get hasData () {
    return this.buffer.length > 0 && this.bytes > 0
  }

  /**
   * Adds an event object to the buffer while tallying size. Only adds the event if it is valid
   * and would not make the event buffer exceed the maxPayloadSize.
   * @param {Object} event the event object to add to the buffer
   * @returns {EventBuffer} returns the event buffer for chaining
   */
  add (event) {
    const size = stringify(event).length
    if (!this.canMerge(size)) return this
    this.#buffer.push(event)
    this.#bytes += size
    return this
  }

  /**
   * clear the buffer data
   * @returns {EventBuffer}
   */
  clear () {
    this.#bytes = 0
    this.#buffer = []
    return this
  }

  /**
   * Hold the buffer data in a new (child) EventBuffer (.held) to unblock the main buffer.
   * This action clears the main buffer
   * @returns {EventBuffer}
   */
  hold () {
    this.held.merge(this)
    this.clear()
    return this
  }

  /**
   * Prepend the held EventBuffer (.held) back into the main buffer
   * This action clears the held buffer
   * @returns {EventBuffer}
   */
  unhold () {
    this.merge(this.held, true)
    this.held.clear()
    return this
  }

  /**
   * Merges an EventBuffer into this EventBuffer
   * @param {EventBuffer} events an EventBuffer intended to merge with this EventBuffer
   * @param {boolean} prepend if true, the supplied events will be prepended before the events of this class
   * @returns {EventBuffer} returns the event buffer for chaining
   */
  merge (eventBuffer, prepend = false) {
    if (!this.canMerge(eventBuffer.bytes)) return this
    this.#buffer = prepend ? [...eventBuffer.buffer, ...this.#buffer] : [...this.#buffer, ...eventBuffer.buffer]
    this.#bytes += eventBuffer.#bytes
    return this
  }

  /**
   * Returns a boolean indicating the resulting size of a merge would be valid. Compares against the maxPayloadSize provided at initialization time.
   * @param {number} size
   * @returns {boolean}
   */
  canMerge (size) {
    return this.bytes + (size || Infinity) < this.maxPayloadSize
  }
}
