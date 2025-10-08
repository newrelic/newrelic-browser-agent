/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Determines whether the `hasReplay` flag should be added and/or the event held based on clues describing the session replay state. Note, there is no need to
 * call this method to evaluate an event that is not suspected of being associated with a replay. this method should be employed at harvest time to decide if its "ready" to send or
 * needs other modifications.
 *
 * Decision rationale:
 * - If the event timestamp is outside the session replay buffer window (which continuously updates with error mode, or is set to 0 for full mode)
 *   or THEN if it has the hasReplay flag but session replay is not actively recording,
 *   the event cannot be associated with a valid replay harvest, so we should NOT add the `hasReplay` flag.
 * - Otherwise, if the event timestamp "seems" valid for when we think a replay was actively recording -- and session replay is recording
 *   but it has never successfully harvested, and this is not the final harvest,
 *   the event should be held for a future harvest attempt.
 * - If this is the final harvest and there has still not been a successful session replay harvest up to this point,
 *   we should NOT add the `hasReplay` flag and the event should be harvested.
 * - Otherwise, we treat the event as being in a valid window and for all we can tell the session replay was active, so it should have the `hasReplay` flag added and can be harvested.
 *
 * @param {Object} agentRef - Reference to the agent containing runtime and session state.
 * @param {number} timestamp - The timestamp of the event being validated.
 * @param {Object} [harvestOpts={}] - Optional harvest options.
 * @param {boolean} [harvestOpts.isFinalHarvest] - Indicates if this is the final harvest attempt.
 * @returns {{ shouldAdd: boolean, shouldHold: boolean }} - Flags indicating whether to add the attribute (shouldAdd) or temporarily hold event from harvesting (shouldHold).
 */
export function hasReplayValidator (agentRef, timestamp, harvestOpts = {}) {
  const eventIsOutsideReplayWindow = timestamp < agentRef.runtime.earliestViableSR
  const srIsNotRecording = !agentRef.runtime.isRecording
  const srIsRecordingButHasNeverHarvested = !srIsNotRecording && !agentRef.runtime.srHarvestedAt

  if (eventIsOutsideReplayWindow || srIsNotRecording) {
    // is event in the valid SR buffer window? (for handling error mode cases)
    // if it is, is SR recording right now? (if it isnt, we prefer to take the less risky option of assigning false negatives over false positives)
    // If neither valid nor recording, this event cant reasonably be related to a valid harvest, so do not add hasReplay and harvest it now.
    return { shouldAdd: false, shouldHold: false }
  } else {
    if (srIsRecordingButHasNeverHarvested) {
      // timestamp is in valid window and a replay is actively recording
      if (harvestOpts.isFinalHarvest) {
      // If this is the final harvest and we still don't have a successful SR harvest, we should not add the hasReplay flag and harvest it now
      // to not drop data and not assign false positives.
        return { shouldAdd: false, shouldHold: false }
      } else {
        // We now suspect a replay will harvest eventually. Because the attribution seems valid, and we are waiting on a valid harvest
        // we should put the event back in the aggregator for later harvesting, to be checked again at the next harvest point.
        // if error mode doesnt harvest and "resets" its look-back buffer, the attribute will be dropped.  If full mode doesnt harvest it will
        // time-out and shut down.  If either harvests successfully, when we re-evaluate the event the next cycle, it will keep the hasReplay attribute and harvest.
        return { shouldAdd: false, shouldHold: true }
      }
    }
  }
  // If we reach this point, the event is in a valid window and we can assume the session replay was active,
  // so it can have its hasReplay flag added and be harvested.
  return { shouldAdd: true, shouldHold: false }
}
