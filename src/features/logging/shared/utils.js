import { handle } from '../../../common/event-emitter/handle'
import { now } from '../../../common/timing/now'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../metrics/constants'
import { LOGGING_EVENT_EMITTER_TYPES } from '../constants'

/**
   *
   * @param {string} message
   * @param {{[key: string]: *}} context
   * @param {string} level
   */
export function bufferLog (ee, message, customAttributes, level = 'info') {
  handle(SUPPORTABILITY_METRIC_CHANNEL, [`API/logging/${level}/called`], undefined, FEATURE_NAMES.metrics, ee)
  handle(LOGGING_EVENT_EMITTER_TYPES.LOG, [now(), message, customAttributes, level], undefined, FEATURE_NAMES.logging, ee)
}
