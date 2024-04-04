export class RecorderEvents {
  constructor ({ canCorrectTimestamps }) {
    /** The buffer to hold recorder event nodes */
    this.events = []
    /** Payload metadata -- Should indicate when a replay blob started recording.  Resets each time a harvest occurs.
     * cycle timestamps are used as fallbacks if event timestamps cannot be used
     */
    this.cycleTimestamp = Date.now()
    /** Payload metadata -- Whether timestamps can be corrected, defaults as false, can be set to true if timekeeper is present at init time.  Used to determine
     * if harvest needs to re-loop through nodes and correct them before sending.  Ideal behavior is to correct them as they flow into the recorder
     * to prevent re-looping, but is not always possible since the timekeeper is not set until after page load and the recorder can be preloaded.
    */
    this.canCorrectTimestamps = !!canCorrectTimestamps
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
