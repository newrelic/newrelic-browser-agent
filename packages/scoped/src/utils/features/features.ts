import { NrFeatures, NrFeature } from "../../types"

export const features = {
    'errors': new NrFeature(NrFeatures.JSERRORS)
}

export function getAllFeatures(): NrFeature[] {
    return Object.values(features)
}

export function getEnabledFeatures(): NrFeature[] {
    return Object.values(features).filter(feature => feature.enabled)
}
