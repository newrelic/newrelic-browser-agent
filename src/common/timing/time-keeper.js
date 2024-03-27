import { gosNREUM } from '../window/nreum'

/**
 * Class used to adjust the timestamp of harvested data to New Relic server time. This
 * is done by tracking the performance timings of the RUM call and applying a calculation
 * to the harvested data event offset time.
 */
export class TimeKeeper {
  /**
   * Represents the browser origin time.
   * @type {number}
   */
  #originTime

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

  constructor (originTime) {
    if (!originTime) throw new Error('TimeKeeper must be supplied a browser origin time.')
    this.#originTime = originTime
  }

  static getTimeKeeperByAgentIdentifier (agentIdentifier) {
    const nr = gosNREUM()
    return Object.keys(nr?.initializedAgents || {}).indexOf(agentIdentifier) > -1
      ? nr.initializedAgents[agentIdentifier].timeKeeper
      : undefined
  }

  /**
   * Returns the current time offset from page origin.
   * @return {number}
   */
  static now () {
    return Math.floor(performance.now())
  }

  get originTime () {
    return this.#originTime
  }

  get correctedOriginTime () {
    if (!this.#correctedOriginTime) throw new Error('InvalidState: Access to correctedOriginTime attempted before NR time calculated.')
    return this.#correctedOriginTime
  }

  /**
   * Process a rum request to calculate NR server time.
   * @param rumRequest {XMLHttpRequest} The xhr for the rum request
   * @param startTime {number} The start time of the RUM request
   * @param endTime {number} The end time of the RUM request
   */
  processRumRequest (rumRequest, startTime, endTime) {
    const responseDateHeader = rumRequest.getResponseHeader('Date')
    if (!responseDateHeader) {
      throw new Error('Missing date header on rum response.')
    }

    const medianRumOffset = (endTime - startTime) / 2
    const serverOffset = Math.floor(startTime + medianRumOffset)

    // Corrected page origin time
    this.#correctedOriginTime = Math.floor(Date.parse(responseDateHeader) - serverOffset)
    this.#localTimeDiff = this.#originTime - this.#correctedOriginTime

    if (Number.isNaN(this.#correctedOriginTime)) {
      throw new Error('Date header invalid format.')
    }
  }

  /**
   * Converts a page origin relative time to an absolute timestamp
   * corrected to NR server time.
   * @param relativeTime {number} The relative time of the event in milliseconds
   * @returns {number} Corrected unix/epoch timestamp
   */
  convertRelativeTimestamp (relativeTime) {
    if (!this.#correctedOriginTime) return this.originTime + relativeTime
    return this.#correctedOriginTime + relativeTime
  }

  /**
   * Corrects an event timestamp to NR server time.
   * @param timestamp {number} The unix/epoch timestamp of the event with milliseconds
   * @return {number} Corrected unix/epoch timestamp
   */
  correctAbsoluteTimestamp (timestamp) {
    if (!this.#localTimeDiff) return timestamp
    return Math.floor(timestamp - this.#localTimeDiff)
  }
}
