import { handle } from '../../../common/event-emitter/handle'
import { now } from '../../../common/timing/now'
import { warn } from '../../../common/util/console'
import { stringify } from '../../../common/util/stringify'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { LOGGING_EVENT_EMITTER_CHANNEL, LOG_LEVELS } from '../constants'

/**
   * @param {ContextualEE} ee - The contextual ee tied to the instance
   * @param {string} message - the log message string
   * @param {{[key: string]: *}} customAttributes - The log's custom attributes if any
   * @param {enum} level - the log level enum
   */
export function bufferLog (ee, message, customAttributes = {}, level = 'info') {
  try {
    if (typeof message !== 'string') {
      const stringified = stringify(message)
      /**
       * Error instances convert to `{}` when stringified
       * Symbol converts to '' when stringified
       * other cases tbd
       * */
      if (!!stringified && stringified !== '{}') message = stringified
      else message = String(message)
    }
  } catch (err) {
    warn('could not cast log message to string', message)
    return
  }
  handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/logging/${level}/called`], undefined, FEATURE_NAMES.metrics, ee)
  handle(LOGGING_EVENT_EMITTER_CHANNEL, [now(), message, customAttributes, level], undefined, FEATURE_NAMES.logging, ee)
}

/**
 * Checks if a supplied log level is acceptable for use in generating a log event
 * @param {string} level
 * @returns {boolean}
 */
export function isValidLogLevel (level) {
  if (typeof level !== 'string') return false
  return Object.values(LOG_LEVELS).some(logLevel => logLevel.toLowerCase() === level.toLowerCase())
}
