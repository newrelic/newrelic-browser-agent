import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'

export const apiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease',
  'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
  'interaction', 'noticeError', 'setUserId', 'setApplicationVersion', 'start', 'recordReplay', 'pauseReplay',
  SR_EVENT_EMITTER_TYPES.RECORD, SR_EVENT_EMITTER_TYPES.PAUSE
]

export const asyncApiMethods = [
  'setErrorHandler', 'finished', 'addToTrace', 'addRelease'
]
