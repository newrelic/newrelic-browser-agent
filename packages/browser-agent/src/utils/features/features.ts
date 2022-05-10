import { NrFeatures, NrFeature } from "../../types"

export class Features {
    
    errors = new NrFeature(NrFeatures.JSERRORS)
    
    getAllFeatures(): NrFeature[] {
        return Object.values(this)
    }
    getEnabledFeatures(): NrFeature[] {
        return Object.values(this).filter(feature => feature.enabled)
    }
}
