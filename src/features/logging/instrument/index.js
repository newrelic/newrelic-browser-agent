import { stringify } from '../../../common/util/stringify'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { bufferLog } from '../shared/utils'

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)

    const instanceEE = this.ee
    /** emitted by wrap-logger function */
    this.ee.on('wrap-logger-end', function handleLog ([message, ...args]) {
      const { level } = this
      bufferLog(instanceEE, message, { ...(!!args.length && { customAttributes: stringify(args) }) }, level)
    })
    this.importAggregator()
  }
}
