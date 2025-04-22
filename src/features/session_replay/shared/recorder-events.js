/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventBuffer } from '../../utils/event-buffer'

export class RecorderEvents {
  /** The buffer to hold recorder event nodes */
  #events = new EventBuffer(Infinity)
  /** Payload metadata -- Should indicate when a replay blob started recording.  Resets each time a harvest occurs.
     * cycle timestamps are used as fallbacks if event timestamps cannot be used
     */
  cycleTimestamp = Date.now()
  /** Payload metadata -- Should indicate that the payload being sent has a full DOM snapshot. This can happen
   * -- When the recording library begins recording, it starts by taking a DOM snapshot
   * -- When visibility changes from "hidden" -> "visible", it must capture a full snapshot for the replay to work correctly across tabs
  */
  hasSnapshot = false
  /** Payload metadata -- Should indicate that the payload being sent has a meta node. The meta node should always precede a snapshot node. */
  hasMeta = false
  /** Payload metadata -- Should indicate that the payload being sent contains an error.  Used for query/filter purposes in UI */
  hasError = false

  constructor (shouldInlineStylesheets = true) {
    /** Payload metadata -- Denotes whether all stylesheet elements were able to be inlined */
    this.inlinedAllStylesheets = shouldInlineStylesheets
  }

  add (event) {
    this.#events.add(event)
  }

  get events () {
    return this.#events.get()
  }

  /** A value which increments with every new mutation node reported. Resets after a harvest is sent */
  get payloadBytesEstimation () {
    return this.#events.byteSize()
  }
}
