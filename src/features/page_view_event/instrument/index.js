import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (thisAgent, auto = true) {
    super(thisAgent, CONSTANTS.FEATURE_NAME, auto)

    this.importAggregator(thisAgent)
  }
}

export const PageViewEvent = Instrument
