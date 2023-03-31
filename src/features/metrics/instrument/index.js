import { InstrumentBase } from '../../utils/instrument-base'
import { insertSupportMetrics } from './workers-helper'
import { FEATURE_NAME, SUPPORTABILITY_METRIC_CHANNEL } from '../constants'
import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'
export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    insertSupportMetrics(tag => handle(SUPPORTABILITY_METRIC_CHANNEL, [tag], undefined, FEATURE_NAMES.metrics, this.ee))
    this.importAggregator()
  }
}
