import { FEATURE_NAMES } from '../../loaders/features/features'

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
}

export const LOGGING_EVENT_EMITTER_CHANNEL = 'log'

export const FEATURE_NAME = FEATURE_NAMES.logging

export const MAX_PAYLOAD_SIZE = 1000000

export const LOGGING_FAILURE_MESSAGE = 'Failed to wrap: '
export const LOGGING_LEVEL_FAILURE_MESSAGE = 'invalid log level: '
export const LOGGING_IGNORED = 'ignored log: '
