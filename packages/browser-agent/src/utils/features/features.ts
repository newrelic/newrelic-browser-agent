import { NrFeatures, NrFeature } from "../../types"

export class Features { 
    errors = new NrFeature(NrFeatures.JSERRORS)
    metrics = new NrFeature(NrFeatures.METRICS)
    page_action = new NrFeature(NrFeatures.PAGE_ACTION)
    
    getEnabledFeatures(): NrFeature[] {
        return Object.values(this).filter(feature => feature.enabled)
    }
}
