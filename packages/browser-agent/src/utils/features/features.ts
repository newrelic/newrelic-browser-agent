import { NrFeatures, NrFeature } from "../../types"

export class Features { 
    errors = new NrFeature(NrFeatures.JSERRORS)
    metrics = new NrFeature(NrFeatures.METRICS)
    
    getEnabledFeatures(): NrFeature[] {
        return Object.values(this).filter(feature => feature.enabled)
    }
}
