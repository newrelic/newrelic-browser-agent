import { NrFeatures } from '../../types'

export function initializeFeatures(enabledFeatures: NrFeatures[]) {
    if (!enabledFeatures.length) return []
    return Promise.all(enabledFeatures.map(async feature => {
        const { initialize: initializeAggregate }: { initialize: any } = await import(`../../../../../modules/features/${feature}/aggregate`)
        initializeAggregate(true)
        return feature
    }))
  }
  