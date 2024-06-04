import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'

/** These will get moved to feature constants once the feature exists */
export const logApiMethods = [
  'logError', 'logWarn', 'logInfo', 'logDebug', 'logTrace'
]

export const apiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease',
  'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
  'interaction', 'noticeError', 'setUserId', 'setApplicationVersion', 'start',
  SR_EVENT_EMITTER_TYPES.RECORD, SR_EVENT_EMITTER_TYPES.PAUSE, ...logApiMethods, 'wrapLogger'
]

export const asyncApiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease'
]
