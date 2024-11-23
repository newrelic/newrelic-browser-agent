import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.genericEvents
export const IDEAL_PAYLOAD_SIZE = 64000
export const MAX_PAYLOAD_SIZE = 1000000

export const OBSERVED_EVENTS = ['auxclick', 'click', 'copy', 'keydown', 'paste', 'scrollend']
export const OBSERVED_WINDOW_EVENTS = ['focus', 'blur']

export const RAGE_CLICK_THRESHOLD_EVENTS = 4
export const RAGE_CLICK_THRESHOLD_MS = 1000

export const RESERVED_EVENT_TYPES = ['PageAction', 'UserAction', 'BrowserPerformance']
