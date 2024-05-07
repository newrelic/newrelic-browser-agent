import { originTime } from '../constants/runtime'
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { getRuntime } from '../config/config'
import { SESSION_EVENT_TYPES, SESSION_EVENTS } from '../session/constants'

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
   * @type {number}
   */
  #ready = false

  constructor (agentIdentifier) {
    this.#session = getRuntime(agentIdentifier)?.session

    if (this.#session) {
      const ee = baseEE.get(agentIdentifier)
      ee.on(SESSION_EVENTS.UPDATE, this.#processSessionUpdate.bind(this))
      ee.on(SESSION_EVENTS.STARTED, () => {
        if (this.#ready) {
          this.#session.write({ serverTimeDiff: this.#localTimeDiff })
        }
      })
      this.#processSessionUpdate(null, this.#session.read())
    }
  }

  get ready () {
    return this.#ready
  }

  get correctedOriginTime () {
    return this.#correctedOriginTime
  }

  /**
   * Process a rum request to calculate NR server time.
   * @param rumRequest {XMLHttpRequest} The xhr for the rum request
   * @param startTime {number} The start time of the RUM request
   * @param endTime {number} The end time of the RUM request
   */
  processRumRequest (rumRequest, startTime, endTime) {
    if (this.#ready) return // Server time calculated from session entity

    const responseDateHeader = rumRequest.getResponseHeader('Date')
    if (!responseDateHeader) {
      throw new Error('Missing date header on rum response.')
    }

    const medianRumOffset = (endTime - startTime) / 2
    const serverOffset = startTime + medianRumOffset

    // Corrected page origin time
    this.#correctedOriginTime = Math.floor(Date.parse(responseDateHeader) - serverOffset)
    this.#localTimeDiff = originTime - this.#correctedOriginTime

    if (Number.isNaN(this.#correctedOriginTime)) {
      throw new Error('Date header invalid format.')
    }

    if (this.#session) this.#session.write({ serverTimeDiff: this.#localTimeDiff })
    this.#ready = true
  }

  /**
   * Converts a page origin relative time to an absolute timestamp
   * corrected to NR server time.
   * @param relativeTime {number} The relative time of the event in milliseconds
   * @returns {number} Corrected unix/epoch timestamp
   */
  convertRelativeTimestamp (relativeTime) {
    return Math.floor(this.#correctedOriginTime + relativeTime)
  }

  /**
   * Corrects an event timestamp to NR server time.
   * @param timestamp {number} The unix/epoch timestamp of the event with milliseconds
   * @return {number} Corrected unix/epoch timestamp
   */
  correctAbsoluteTimestamp (timestamp) {
    return Math.floor(timestamp - this.#localTimeDiff)
  }

  /**
   * Processes a session entity update payload to extract the server time calculated.
   * @param {import('../session/constants').SESSION_EVENT_TYPES | null} type
   * @param {Object} data
   */
  #processSessionUpdate (type, data) {
    if (typeof data?.serverTimeDiff !== 'number') return

    if (
      (!type && !this.#ready) || // This captures the initial read from the session entity when the timekeeper first initializes
      type === SESSION_EVENT_TYPES.CROSS_TAB // This captures any cross-tab write of the session entity
    ) {
      // This captures the initial read from the session entity when the timekeeper first initializes
      this.#localTimeDiff = data.serverTimeDiff
      this.#correctedOriginTime = originTime - this.#localTimeDiff
      this.#ready = true
    }
  }
}
