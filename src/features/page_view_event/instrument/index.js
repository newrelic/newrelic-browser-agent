import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { model } from '../model'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true, init) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, { auto, init, model: model() })

    this.importAggregator()
  }
}
