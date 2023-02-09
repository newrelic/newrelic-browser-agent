import { InstrumentBase } from '../../utils/instrument-base'
import { insertSupportMetrics } from './workers-helper'
import { FEATURE_NAME } from '../constants'

export class Instrument extends InstrumentBase {
    static featureName = FEATURE_NAME
    constructor(agentIdentifier, aggregator, auto = true) {
        super(agentIdentifier, aggregator, FEATURE_NAME, auto)
        insertSupportMetrics(this.ee)
        this.importAggregator()
    }
}

