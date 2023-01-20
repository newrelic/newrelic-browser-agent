import { getConfigurationValue } from "../../../common/config/config";
import { registerHandler } from "../../../common/event-emitter/register-handler";
import { HarvestScheduler } from "../../../common/harvest/harvest-scheduler";
import { AggregateBase } from "../../utils/aggregate-base";
import { FEATURE_NAME } from "../constants";
import { drain } from '../../../common/drain/drain'

export class Aggregate extends AggregateBase {
    static featureName = FEATURE_NAME
    constructor(agentIdentifier, aggregator) {
        super(agentIdentifier, aggregator, FEATURE_NAME)

        registerHandler('storeMetric', (...args) => this.storeMetric(...args),  this.featureName, this.ee)
        registerHandler('storeEventMetrics', (...args) => this.storeEventMetrics(...args),  this.featureName, this.ee)

        var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'metrics.harvestTimeSeconds') || 30

        var scheduler = new HarvestScheduler('jserrors', {}, this)
        scheduler.startTimer(harvestTimeSeconds)
        scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))

        drain(this.agentIdentifier, this.featureName)
        // if rum response determines that customer lacks entitlements for ins endpoint, block it
        this.ee.on('block-err', () => {
            this.blocked = true
            scheduler.stopTimer()
        })
    }

    storeMetric(type, name, params, value) {
        if (this.blocked) return
        this.aggregator.storeMetric(type, name, params, value)
    }

    storeEventMetrics(type, name, params, metrics) {
        if (this.blocked) return
        this.aggregator.store(type, name, params, metrics)
    }
}