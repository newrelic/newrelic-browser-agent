import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentRef, auto = true) {
    super(agentRef, CONSTANTS.FEATURE_NAME, auto)

    this.importAggregator(agentRef)
  }
}

export const PageViewEvent = Instrument
