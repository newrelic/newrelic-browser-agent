export class RecorderEvents {
  constructor () {
    /** The buffer to hold recorder event nodes */
    this.events = []
    /** Payload metadata -- Should indicate when a replay blob started recording.  Resets each time a harvest occurs.
     * cycle timestamps are used as fallbacks if event timestamps cannot be used
     */
    this.cycleTimestamp = Date.now()
    /** A value which increments with every new mutation node reported. Resets after a harvest is sent */
    this.payloadBytesEstimation = 0
    /** Payload metadata -- Should indicate that the payload being sent has a full DOM snapshot. This can happen
     * -- When the recording library begins recording, it starts by taking a DOM snapshot
     * -- When visibility changes from "hidden" -> "visible", it must capture a full snapshot for the replay to work correctly across tabs
    */
    this.hasSnapshot = false
    /** Payload metadata -- Should indicate that the payload being sent has a meta node. The meta node should always precede a snapshot node. */
    this.hasMeta = false
    /** Payload metadata -- Should indicate that the payload being sent contains an error.  Used for query/filter purposes in UI */
    this.hasError = false
    /** Payload metadata -- Denotes whether all stylesheet elements were able to be inlined */
    this.inlinedAllStylesheets = true
  }

  add (event) {
    this.events.push(event)
  }
}
