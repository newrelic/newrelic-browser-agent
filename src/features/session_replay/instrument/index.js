
import { getRuntime } from '../../../common/config/config'
import { drain } from '../../../common/drain/drain'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)

    this.importAggregator()
  }
}
