import { handle } from '../../../common/event-emitter/handle'
import { isiOS } from '../../../common/constants/runtime'
import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { getRuntime } from '../../../common/config/config'
import { onDOMContentLoaded, onWindowLoad } from '../../../common/window/load'
import { now } from '../../../common/timing/now'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, auto)

    this.importAggregator()
  }
}
