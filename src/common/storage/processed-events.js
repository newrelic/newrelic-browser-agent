import { MAX_PAYLOAD_SIZE } from '../constants/agent-constants'
import { stringify } from '../util/stringify'

export class ProcessedEvents {
  constructor (options = {}) {
    this.events = []
    this.eventsRawSize = 0
    /** Provided callback with a single arg accepting an array of events for features that serializes their payloads a certain way. */
    this.serializer = options.serializer
  }

  /**
   * Add feature-processed event to our buffer. If this event would cause our total raw size to exceed the set max payload size, it is dropped.
   * @param {any} event - any primitive type or object
   * @returns {Boolean} true if successfully added; false otherwise
   */
  addEvent (event) {
    const newEventSize = stringify(event)?.length || 0 // (estimate) # of bytes a directly stringified event it would take to send
    if (this.eventsRawSize + newEventSize > MAX_PAYLOAD_SIZE) return false

    this.events.push(event)
    this.eventsRawSize += newEventSize
    return true
  }

  /**
   * Format pending events for harvest.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @returns final payload, or undefined if there are no pending events
   */
  makeHarvestPayload (shouldRetryOnFail = false) {
    if (!this.events.length) return

    if (shouldRetryOnFail) {
      this.eventsBackup = this.events
      this.eventsBackupRawSize = this.eventsRawSize
    }
    const payload = this.serializer ? this.serializer(this.events) : this.events
    this.events = []
    this.eventsRawSize = 0

    return {
      body: payload
    }
  }

  /**
   * Cleanup task after a harvest.
   * @param {Boolean} harvestFailed - harvester flag to restore events in main buffer for retry later if request failed
   */
  postHarvestCleanup (harvestFailed = false) {
    const combinedSize = this.eventsBackupRawSize + this.eventsRawSize
    if (harvestFailed && this.eventsBackup && (this.eventsBackupRawSize + this.eventsRawSize <= MAX_PAYLOAD_SIZE)) {
      // If the combined payload would exceed the ingest limit, we would drop the old data.
      this.events = [...this.eventsBackup, ...this.events]
      this.eventsRawSize = combinedSize
    }
    delete this.eventsBackup
    this.eventsBackupRawSize = 0
  }
}
