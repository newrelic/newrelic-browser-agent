import { getConfigurationValue } from "../../../common/config/config";
import { registerHandler } from "../../../common/event-emitter/register-handler";
import { HarvestScheduler } from "../../../common/harvest/harvest-scheduler";
import { AggregateBase } from "../../../common/util/feature-base";
import { FEATURE_NAME } from "../constants";

export class Aggregate extends AggregateBase {
    constructor(agentIdentifier, aggregator) {
        super(agentIdentifier, aggregator, FEATURE_NAME)

        registerHandler('storeMetric', (...args) => this.storeMetric(...args), undefined, this.ee)
        registerHandler('storeEventMetrics', (...args) => this.storeEventMetrics(...args), undefined, this.ee)

        var harvestTimeSeconds = getConfigurationValue(this.agentIdentifier, 'jserrors.harvestTimeSeconds') || 10

        var scheduler = new HarvestScheduler('jserrors', { }, this)
        scheduler.startTimer(harvestTimeSeconds)
        scheduler.harvest.on('jserrors', () => ({ body: this.aggregator.take(['cm', 'sm']) }))
    }

    storeMetric(type, name, params, value) {
        this.aggregator.storeMetric(type, name, params, value)
    }

    storeEventMetrics(type, name, params, metrics) {
        this.aggregator.store(type, name, params, metrics)
    }
}