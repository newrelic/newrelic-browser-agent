import { FEATURE_NAMES } from "./features";

export function getFeatureDependencyNames(feature) {
  switch (feature) {
    case FEATURE_NAMES.ajax:
      return [FEATURE_NAMES.jserrors];
    case FEATURE_NAMES.sessionTrace:
      return [FEATURE_NAMES.ajax, FEATURE_NAMES.pageViewEvent];
    case FEATURE_NAMES.pageViewTiming:
      return [FEATURE_NAMES.pageViewEvent]; // this could change if we disconnect window load timings
    default:
      return [];
  }
}

export function getFrozenAttributes(feature) {
  switch (feature) {
    // right now, jserrors is the only feature that can have "on" or "off" page-level auto-instrumentation...
    // page_action is always "off" (no instr)
    // as new API/manual implementation methods are added, this list can likely be pruned
    case FEATURE_NAMES.jserrors:
      return [];
    default:
      return ["auto"];
  }
}
