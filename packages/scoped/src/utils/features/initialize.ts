import { getEnabledFeatures } from './features'

export function initializeFeatures() {

    return Promise.all(getEnabledFeatures().map(async feature => {
        if (feature.auto) {
            const { initialize: initializeInstrument }: { initialize: any } = await import(`../../../../../modules/features/${feature.featureName}/instrument`)
            initializeInstrument()
        }
        const { initialize: initializeAggregate }: { initialize: any } = await import(`../../../../../modules/features/${feature.featureName}/aggregate`)
        initializeAggregate()
        return feature.featureName
    }))
}
