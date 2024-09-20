import { FEATURE_NAMES } from '../../loaders/features/features'
import { ProcessedEvents } from '../../common/storage/processed-events'

export const FEATURE_TO_ENDPOINT = {
  [FEATURE_NAMES.pageViewTiming]: 'events',
  [FEATURE_NAMES.ajax]: 'events',
  [FEATURE_NAMES.spa]: 'events',
  [FEATURE_NAMES.softNav]: 'events',
  [FEATURE_NAMES.metrics]: 'jserrors',
  [FEATURE_NAMES.jserrors]: 'jserrors',
  [FEATURE_NAMES.sessionTrace]: 'browser/blobs',
  [FEATURE_NAMES.sessionReplay]: 'browser/blobs',
  [FEATURE_NAMES.logging]: 'browser/logs',
  [FEATURE_NAMES.genericEvents]: 'ins'
}

/**
 * Grab the existing (or new) ProcessedEvents instance based on feature. This may be shared across some features.
 * @param {String} featureName
 * @param {Object} runtimePendingEvents - this agent's runtime.pendingEvents map
 * @param {Object} newStorageOptions - options to pass to the ProcessedEvents constructor
 * @returns {ProcessedEvents}
 */
export function getStorageInstance (featureName, runtimePendingEvents, newStorageOptions = {}) {
  const harvestEndpoint = FEATURE_TO_ENDPOINT[featureName]
  if (!runtimePendingEvents[harvestEndpoint]) runtimePendingEvents[harvestEndpoint] = []
  let eventsStorage

  if (harvestEndpoint === 'jserrors' && runtimePendingEvents[harvestEndpoint].length) {
    // These features can combine payloads for harvesting, so use the same instance if it already exists.
    return runtimePendingEvents[harvestEndpoint][0]
    // Rest of the features all require their own separate harvests = storage.
  }
  eventsStorage = new ProcessedEvents(newStorageOptions)
  runtimePendingEvents[harvestEndpoint].push(eventsStorage)
  return eventsStorage
}
