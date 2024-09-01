import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, { aggregator, eventManager }, auto = true) {
    super(agentIdentifier, { aggregator, eventManager }, CONSTANTS.FEATURE_NAME, auto)

    this.importAggregator()
  }
}

export const PageViewEvent = Instrument
