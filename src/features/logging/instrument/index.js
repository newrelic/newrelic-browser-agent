import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { bufferLog } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (thisAgent, auto = true) {
    super(thisAgent, FEATURE_NAME, auto)

    const instanceEE = this.ee
    /** emitted by wrap-logger function */
    this.ee.on('wrap-logger-end', function handleLog ([message]) {
      const { level, customAttributes } = this
      bufferLog(instanceEE, message, customAttributes, level)
    })
    this.importAggregator(thisAgent)
  }
}

export const Logging = Instrument
