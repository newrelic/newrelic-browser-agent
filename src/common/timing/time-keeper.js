import { originTime } from '../constants/runtime'
import { getRuntime } from '../config/runtime'

const rfc2616Regex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([0-3][0-9]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{4}) ([01][0-9]|2[0-3])(:[0-5][0-9]){2} GMT$/

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

  constructor (agentIdentifier) {
    this.#session = getRuntime(agentIdentifier)?.session
    this.processStoredDiff()
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
   */
  processRumRequest (rumRequest, startTime, endTime) {
    this.processStoredDiff() // Check session entity for stored time diff
    if (this.#ready) return // Server time calculated from session entity

    const responseDateHeader = rumRequest.getResponseHeader('Date')
    if (!responseDateHeader) {
      throw new Error('Missing date header on rum response.')
    }
    if (!rfc2616Regex.test(responseDateHeader)) {
      throw new Error('Date header invalid format.')
    }

    const medianRumOffset = (endTime - startTime) / 2
    const serverOffset = startTime + medianRumOffset

    // Corrected page origin time
    this.#correctedOriginTime = Math.floor(Date.parse(responseDateHeader) - serverOffset)
    this.#localTimeDiff = originTime - this.#correctedOriginTime

    if (isNaN(this.#correctedOriginTime)) {
      throw new Error('Date header invalid format.')
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
    return originTime + relativeTime
  }

  /**
   * Converts an absolute timestamp to a relative timestamp using the
   * user's local clock.
   * @param timestamp
   * @returns {number}
   */
  convertAbsoluteTimestamp (timestamp) {
    return timestamp - originTime
  }

  /**
   * Corrects an absolute timestamp to NR server time.
   * @param timestamp {number} The unix/epoch timestamp of the event with milliseconds
   * @return {number} Corrected unix/epoch timestamp
   */
  correctAbsoluteTimestamp (timestamp) {
    return timestamp - this.#localTimeDiff
  }

  /**
   * Corrects relative timestamp to NR server time (epoch).
   * @param {DOMHighResTimeStamp} relativeTime
   * @returns {number}
   */
  correctRelativeTimestamp (relativeTime) {
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
