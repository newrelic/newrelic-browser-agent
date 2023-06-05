import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME, SUPPORTABILITY_METRIC_CHANNEL } from '../constants'
import { handle } from '../../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../../../loaders/features/features'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)
    this.importAggregator()
  }
}
