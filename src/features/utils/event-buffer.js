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

/**
 * A container that holds, evaluates, and merges event objects for harvesting
 */
export class EventBuffer2 {
  #buffer = []
  #rawBytes = 0
  #bufferBackup
  #rawBytesBackup

  /**
   * @param {number} maxPayloadSize
   */
  constructor (maxPayloadSize = MAX_PAYLOAD_SIZE) {
    this.maxPayloadSize = maxPayloadSize
  }

  isEmpty () {
    return this.#buffer.length === 0
  }

  get () {
    return this.#buffer
  }

  byteSize () {
    return this.#rawBytes
  }

  /**
   * Add feature-processed event to our buffer. If this event would cause our total raw size to exceed the set max payload size, it is dropped.
   * @param {any} event - any primitive type or object
   * @returns {Boolean} true if successfully added; false otherwise
   */
  add (event) {
    const addSize = stringify(event)?.length || 0 // (estimate) # of bytes a directly stringified event it would take to send
    if (this.#rawBytes + addSize > this.maxPayloadSize) return false
    this.#buffer.push(event)
    this.#rawBytes += addSize
    return true
  }

  /**
   * Wipes the main buffer
   */
  clear () {
    this.#buffer = []
    this.#rawBytes = 0
  }

  /**
   * Backup the buffered data and clear the main buffer
   * @returns {Array} the events being backed up
   */
  save () {
    this.#bufferBackup = this.#buffer
    this.#rawBytesBackup = this.#rawBytes
  }

  /**
   * Wipes the backup buffer
   */
  clearSave () {
    this.#bufferBackup = undefined
    this.#rawBytesBackup = undefined
  }

  /**
   * Prepend the backup buffer back into the main buffer
   */
  reloadSave () {
    if (!this.#bufferBackup) return
    if (this.#rawBytesBackup + this.#rawBytes > this.maxPayloadSize) return
    this.#buffer = [...this.#bufferBackup, ...this.#buffer]
    this.#rawBytes = this.#rawBytesBackup + this.#rawBytes
    this.clearSave()
  }
}
