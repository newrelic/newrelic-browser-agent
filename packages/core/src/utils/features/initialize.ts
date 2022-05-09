
import { NrFeatures } from '../../types'
import { Api } from '../api/api'
import { Features } from './features'
import { Aggregator } from '../../../../../modules/common/aggregate/aggregator'

export function initializeFeatures(agentIdentifier: string, api: Api, sharedAggregator: Aggregator, features: Features) {

    return Promise.all(features.getEnabledFeatures().map(async feature => {
        if (feature.auto) {
            const { Instrument }: { Instrument: any } = await import(`../../../../../modules/features/${feature.name}/instrument`) // dont lazy load this -- put it in main bundle
            const featureInstrumentation = new Instrument(agentIdentifier)
            console.log("initialized instrument!", featureInstrumentation)
        }
        const { Aggregate }: { Aggregate: any } = await import(`../../../../../modules/features/${feature.name}/aggregate`)
        const featureAggregator = new Aggregate(agentIdentifier, sharedAggregator)
        if (feature.name === NrFeatures.JSERRORS) api.importedMethods.storeError = (...args) => featureAggregator.storeError(...args)
        return feature.name
    }))
}
