import { FEATURE_NAMES } from './features'

export function getFeatureDependencyNames (feature) {
  switch (feature) {
    case FEATURE_NAMES.ajax:
      return [FEATURE_NAMES.jserrors]
    case FEATURE_NAMES.sessionTrace:
      return [FEATURE_NAMES.ajax, FEATURE_NAMES.pageViewEvent]
    case FEATURE_NAMES.pageViewTiming:
      return [FEATURE_NAMES.pageViewEvent] // this could change if we disconnect window load timings
    default:
      return []
  }
}

export function getFrozenAttributes (feature) {
  switch (feature) {
    // right now, nothing is frozen.
    //config attributes that we dont want to be able to be easily changed from the top-level page would go here
    default:
      return []
  }
}
