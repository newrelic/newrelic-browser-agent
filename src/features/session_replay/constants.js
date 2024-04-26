import { MODE } from '../../common/session/constants'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { SESSION_REPLAY_ABORT_CROSS_TAB, SESSION_REPLAY_ABORT_ENTITLEMENT, SESSION_REPLAY_ABORT_IMPORT, SESSION_REPLAY_ABORT_RESET, SESSION_REPLAY_ABORT_TOO_BIG, SESSION_REPLAY_ABORT_TOO_MANY } from '../utils/supportability-metrics'

export const FEATURE_NAME = FEATURE_NAMES.sessionReplay

export const SR_EVENT_EMITTER_TYPES = {
  RECORD: 'recordReplay',
  PAUSE: 'pauseReplay',
  REPLAY_RUNNING: 'replayRunning',
  ERROR_DURING_REPLAY: 'errorDuringReplay'
}

export const AVG_COMPRESSION = 0.12
export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}
/** Vortex caps payload sizes at 1MB */
export const MAX_PAYLOAD_SIZE = 1000000
/** Unloading caps around 64kb */
export const IDEAL_PAYLOAD_SIZE = 64000
/** Interval between forcing new full snapshots -- 15 seconds in error mode (x2), 5 minutes in full mode */
export const CHECKOUT_MS = { [MODE.ERROR]: 15000, [MODE.FULL]: 300000, [MODE.OFF]: 0 }
export const ABORT_REASONS = {
  RESET: {
    message: 'Session was reset',
    sm: SESSION_REPLAY_ABORT_RESET
  },
  IMPORT: {
    message: 'Recorder failed to import',
    sm: SESSION_REPLAY_ABORT_IMPORT
  },
  TOO_MANY: {
    message: '429: Too Many Requests',
    sm: SESSION_REPLAY_ABORT_TOO_MANY
  },
  TOO_BIG: {
    message: 'Payload was too large',
    sm: SESSION_REPLAY_ABORT_TOO_BIG
  },
  CROSS_TAB: {
    message: 'Session Entity was set to OFF on another tab',
    sm: SESSION_REPLAY_ABORT_CROSS_TAB
  },
  ENTITLEMENTS: {
    message: 'Session Replay is not allowed and will not be started',
    sm: SESSION_REPLAY_ABORT_ENTITLEMENT
  }
}
/** Reserved room for query param attrs */
export const QUERY_PARAM_PADDING = 5000
