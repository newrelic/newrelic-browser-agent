import { handle } from '../../../common/event-emitter/handle'
import { now } from '../../../common/timing/now'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { LOGGING_EVENT_EMITTER_CHANNEL } from '../constants'

/**
   * @param {ContextualEE} ee - The contextual ee tied to the instance
   * @param {string} message - the log message string
   * @param {{[key: string]: *}} customAttributes - The log's custom attributes if any
   * @param {enum} level - the log level enum
   */
export function bufferLog (ee, message, customAttributes, level = 'info') {
  handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/logging/${level}/called`], undefined, FEATURE_NAMES.metrics, ee)
  handle(LOGGING_EVENT_EMITTER_CHANNEL, [now(), message, customAttributes, level], undefined, FEATURE_NAMES.logging, ee)
}
