import { MAX_PAYLOAD_SIZE } from '../constants/agent-constants'
import { stringify } from '../util/stringify'

export class ProcessedEvents {
  constructor (options = {}) {
    this.events = []
    this.eventsRawSize = 0
    this.serializer = options.serializer
  }

  addEvent (event) {
    this.events.push(event)
    this.eventsRawSize += stringify(event).length // (estimate) # of bytes a directly stringified event it would take to send
  }

  /**
   * Format pending events for harvest.
   * @param {Boolean} shouldRetryOnFail - harvester flag to backup payload for retry later if harvest request fails; this should be moved to harvester logic
   * @returns final payload body, or undefined if there are no pending events
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
    return payload
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
