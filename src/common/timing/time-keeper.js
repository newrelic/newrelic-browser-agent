/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { originTime } from '../constants/runtime'
import { isNative } from '../util/monkey-patched'
import { handle } from '../event-emitter/handle'
import { FEATURE_NAMES } from '../../loaders/features/features'

/**
 * Class used to adjust the timestamp of harvested data to New Relic server time. This
 * is done by tracking the performance timings of the RUM call and applying a calculation
 * to the harvested data event offset time.
 */
export class TimeKeeper {
  /**
   * Pointer to the current agent session if it exists.
   * @type {import('../session/session-entity').SessionEntity}
   */
  #session

  /**
   * Represents the browser origin time corrected to NR server time.
   * @type {number}
   */
  #correctedOriginTime

  /**
   * Represents the difference in milliseconds between the calculated NR server time and
   * the local time.
   * @type {number}
   */
  #localTimeDiff

  /**
   * Represents whether the timekeeper is in a state that it can accurately convert
   * timestamps.
   * @type {boolean}
   */
  #ready = false

  #reportedDrift = false

  constructor (sessionObj) {
    this.#session = sessionObj
    this.processStoredDiff()
    isNative(performance.now, Date.now) // will warn the user if these are not native functions.  We need these to be native for time in the agent to be accurate in general.
  }

  #detectDrift () {
    if (this.#reportedDrift) return
    try {
      // Drift detection: measures if performance.now() and Date.now() have become desynchronized
      // This can happen when a machine sleeps and the performance timer freezes while Date continues
      // this can also happen when a user sets their clock forward during the page lifecycle,
      // but we have no way of distinguishing that from actual clock drift so we will just treat it as drift.
      // In either case, the performance timestamps would be inaccurate at that point so we want to detect and report a count of it.
      // We only detect positive drift (performance clock falling behind Date clock)
      // Note: localTimeDiff (server time offset) is NOT part of drift - that's a legitimate offset
      const drift = (Date.now() - performance.timeOrigin) - performance.now()
      if (drift > 1000) {
        this.#reportedDrift = true
        handle(SUPPORTABILITY_METRIC_CHANNEL, ['Generic/TimeKeeper/ClockDrift/Detected', drift], undefined, FEATURE_NAMES.metrics, this.#session.agentRef.ee)
      }
    } catch (err) {
      // Silently ignore drift detection errors to avoid breaking normal operation
    }
  }

  get ready () {
    return this.#ready
  }

  get correctedOriginTime () {
    return this.#correctedOriginTime
  }

  get localTimeDiff () {
    return this.#localTimeDiff
  }

  /**
   * Process a rum request to calculate NR server time.
   * @param rumRequest {XMLHttpRequest} The xhr for the rum request
   * @param startTime {number} The start time of the RUM request
   * @param endTime {number} The end time of the RUM request
   * @param nrServerTime {number} the unix number value of the NR server time in MS, returned in the RUM request body
   */
  processRumRequest (rumRequest, startTime, endTime, nrServerTime) {
    this.processStoredDiff() // Check session entity for stored time diff
    if (this.#ready) return // Server time calculated from session entity

    if (!nrServerTime) throw new Error('nrServerTime not found')

    const medianRumOffset = (endTime - startTime) / 2
    const serverOffset = startTime + medianRumOffset

    // Corrected page origin time
    this.#correctedOriginTime = Math.floor(nrServerTime - serverOffset)
    this.#localTimeDiff = originTime - this.#correctedOriginTime

    if (isNaN(this.#correctedOriginTime)) {
      throw new Error('Failed to correct browser time to server time')
    }

    this.#session?.write({ serverTimeDiff: this.#localTimeDiff })
    this.#ready = true
  }

  /**
   * Converts a page origin relative time to an absolute timestamp
   * using the user's local clock.
   * @param relativeTime {number} The relative time of the event in milliseconds
   * @returns {number} Corrected unix/epoch timestamp
   */
  convertRelativeTimestamp (relativeTime) {
    this.#detectDrift()
    return originTime + relativeTime
  }

  /**
   * Converts an absolute timestamp to a relative timestamp using the
   * user's local clock.
   * @param timestamp
   * @returns {number}
   */
  convertAbsoluteTimestamp (timestamp) {
    this.#detectDrift()
    return timestamp - originTime
  }

  /**
   * Corrects an absolute timestamp to NR server time.
   * @param timestamp {number} The unix/epoch timestamp of the event with milliseconds
   * @return {number} Corrected unix/epoch timestamp
   */
  correctAbsoluteTimestamp (timestamp) {
    this.#detectDrift()
    return timestamp - this.#localTimeDiff
  }

  /**
   * Corrects relative timestamp to NR server time (epoch).
   * @param {DOMHighResTimeStamp} relativeTime
   * @returns {number}
   */
  correctRelativeTimestamp (relativeTime) {
    this.#detectDrift()
    return this.correctAbsoluteTimestamp(this.convertRelativeTimestamp(relativeTime))
  }

  /** Process the session entity and use the info to set the main time calculations if present */
  processStoredDiff () {
    if (this.#ready) return // Time diff has already been calculated

    const storedServerTimeDiff = this.#session?.read()?.serverTimeDiff
    if (typeof storedServerTimeDiff === 'number' && !isNaN(storedServerTimeDiff)) {
      this.#localTimeDiff = storedServerTimeDiff
      this.#correctedOriginTime = originTime - this.#localTimeDiff
      this.#ready = true
    }
  }
}
