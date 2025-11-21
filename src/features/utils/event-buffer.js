/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { stringify } from '../../common/util/stringify'
import { MAX_PAYLOAD_SIZE } from '../../common/constants/agent-constants'

export class EventBuffer {
  #buffer = []
  #rawBytes = 0
  #hasV2Data = false

  #bufferBackup
  #rawBytesBackup
  #hasV2DataBackup

  /**
   * Creates an event buffer that can hold feature-processed events.
   * @param {Number} maxPayloadSize The maximum size of the payload that can be stored in this buffer.
   * @param {Object} [featureAgg] - the feature aggregate instance
   */
  constructor (maxPayloadSize = MAX_PAYLOAD_SIZE, featureAgg) {
    this.maxPayloadSize = maxPayloadSize
    this.featureAgg = featureAgg
  }

  get length () {
    return this.#buffer.length
  }

  getRequiredVersion () {
    return this.#hasV2Data ? 2 : 1
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
   * @param {number} [evaluatedSize] - the evalated size of the event, if already done so before storing in the event buffer
   * @returns {Boolean} true if successfully added; false otherwise
   */
  add (event, evaluatedSize, hasV2Data = false) {
    const addSize = evaluatedSize || stringify(event)?.length || 0 // (estimate) # of bytes a directly stringified event it would take to send
    if (this.#rawBytes + addSize > this.maxPayloadSize) {
      const smTag = inject => `EventBuffer/${inject}/Dropped/Bytes`
      this.featureAgg?.reportSupportabilityMetric(smTag(this.featureAgg.featureName), addSize) // bytes dropped for this feature will aggregate with this metric tag
      this.featureAgg?.reportSupportabilityMetric(smTag('Combined'), addSize) // all bytes dropped across all features will aggregate with this metric tag
      return false
    }
    this.#buffer.push(event)
    this.#rawBytes += addSize
    this.featureAgg?.decideEarlyHarvest() // check if we should harvest early with new data
    this.#hasV2Data ||= hasV2Data
    return true
  }

  /**
 * Merges events in the buffer that match the given criteria.
 * @param {Function} matcher - A function that takes an event and returns true if it should be merged.
 * @param {Object} data - The data to merge into the matching events.
 * @returns {boolean} true if a match was found and merged; false otherwise.
 */
  merge (matcher, data, hasV2Data = false) {
    if (this.isEmpty() || !matcher) return false
    const matchIdx = this.#buffer.findIndex(matcher)
    if (matchIdx < 0) return false
    this.#buffer[matchIdx] = {
      ...this.#buffer[matchIdx],
      ...data
    }
    this.#hasV2Data ||= hasV2Data
    return true
  }

  /**
   * Wipes the main buffer
   * @param {Object} [opts] - options for clearing the buffer
   * @param {Number} [opts.clearBeforeTime] - timestamp before which all events should be cleared
   * @param {String} [opts.timestampKey] - the key in the event object that contains the timestamp to compare against `clearBefore`
   * @param {Number} [opts.clearBeforeIndex] - index before which all events should be cleared
   * @returns {void}
   */
  clear (opts = {}) {
    if (opts.clearBeforeTime !== undefined && opts.timestampKey) {
      this.#buffer = this.#buffer.filter(event => event[opts.timestampKey] >= opts.clearBeforeTime)
    } else if (opts.clearBeforeIndex !== undefined) {
      this.#buffer = this.#buffer.slice(opts.clearBeforeIndex)
    } else {
      this.#buffer = []
    }
    this.#rawBytes = this.#buffer.length ? stringify(this.#buffer)?.length || 0 : 0 // recalculate raw bytes after clearing
    this.#hasV2Data = false
  }

  /**
   * Backup the buffered data and clear the main buffer
   */
  save () {
    this.#bufferBackup = this.#buffer
    this.#rawBytesBackup = this.#rawBytes
    this.#hasV2DataBackup = this.#hasV2Data
  }

  /**
   * Wipes the backup buffer
   */
  clearSave () {
    this.#bufferBackup = undefined
    this.#rawBytesBackup = undefined
    this.#hasV2DataBackup = undefined
  }

  /**
   * Prepend the backup buffer back into the main buffer
   */
  reloadSave () {
    if (!this.#bufferBackup) return
    if (this.#rawBytesBackup + this.#rawBytes > this.maxPayloadSize) return
    this.#buffer = [...this.#bufferBackup, ...this.#buffer]
    this.#rawBytes = this.#rawBytesBackup + this.#rawBytes
    this.#hasV2Data = this.#hasV2DataBackup || this.#hasV2Data
  }
}
