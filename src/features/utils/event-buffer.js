/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../common/util/stringify'
import { MAX_PAYLOAD_SIZE } from '../../common/constants/agent-constants'

export class EventBuffer {
  #buffer = []
  #rawBytes = 0
  #bufferBackup
  #rawBytesBackup

  /**
   * Creates an event buffer that can hold feature-processed events.
   * @param {Number} maxPayloadSize The maximum size of the payload that can be stored in this buffer.
   * @param {Object} [featureAgg] - the feature aggregate instance
   */
  constructor (maxPayloadSize = MAX_PAYLOAD_SIZE, featureAgg) {
    this.maxPayloadSize = maxPayloadSize
    this.featureAgg = featureAgg
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

  wouldExceedMaxSize (incomingSize) {
    return this.#rawBytes + incomingSize > this.maxPayloadSize
  }

  /**
   * Add feature-processed event to our buffer. If this event would cause our total raw size to exceed the set max payload size, it is dropped.
   * @param {any} event - any primitive type or object
   * @returns {Boolean} true if successfully added; false otherwise
   */
  add (event) {
    const addSize = stringify(event)?.length || 0 // (estimate) # of bytes a directly stringified event it would take to send
    if (this.#rawBytes + addSize > this.maxPayloadSize) {
      const smTag = inject => `EventBuffer/${inject}/Dropped/Bytes`
      this.featureAgg?.reportSupportabilityMetric(smTag(this.featureAgg.featureName), addSize) // bytes dropped for this feature will aggregate with this metric tag
      this.featureAgg?.reportSupportabilityMetric(smTag('Combined'), addSize) // all bytes dropped across all features will aggregate with this metric tag
      return false
    }
    this.#buffer.push(event)
    this.#rawBytes += addSize
    this.featureAgg?.ee.emit('event-buffered', [this.featureAgg])
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
  }
}
