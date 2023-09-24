import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { model } from '../model'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true, init) {
    super(agentIdentifier, aggregator, FEATURE_NAME, { auto, init, model: model() })
    this.importAggregator()
  }
}
