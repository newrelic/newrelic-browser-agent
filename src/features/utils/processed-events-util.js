import { FEATURE_NAMES } from '../../loaders/features/features'

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
