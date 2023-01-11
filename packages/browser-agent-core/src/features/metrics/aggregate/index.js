import { getConfigurationValue } from "../../../common/config/config";
import { registerHandler } from "../../../common/event-emitter/register-handler";
import { HarvestScheduler } from "../../../common/harvest/harvest-scheduler";
import { FeatureBase } from "../../../common/util/feature-base";

export class Aggregate extends FeatureBase {
    constructor(agentIdentifier, aggregator) {
        super(agentIdentifier, aggregator)

        registerHandler('storeMetric', (...args) => this.storeMetric(...args), undefined, this.ee)
        registerHandler('storeEventMetrics', (...args) => this.storeEventMetrics(...args), undefined, this.ee)

        var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'jserrors.harvestTimeSeconds') || 10

        var scheduler = new HarvestScheduler('jserrors', { }, this)
        scheduler.startTimer(harvestTimeSeconds)
        scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))
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