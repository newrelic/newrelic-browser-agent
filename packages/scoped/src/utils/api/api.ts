<<<<<<< HEAD:packages/scoped/src/utils/api/api.ts
import { NrFeatures, NrStoreError } from "../../types"
=======
import { NrFeatures, NrStoreError } from "../types"
>>>>>>> e9cec65726ffdbc4e906f400634344e62304d2ab:packages/core/src/utils/api-defaults.ts

let initialized = false

export const api: {[keys: string]: null | Function} = {
  storeError: null
}

export async function initialize(features: NrFeatures[]){
  initialized = true

  return Promise.all(features.map(async feature => {
    if (feature === NrFeatures.JSERRORS) {
      const { storeError }: { storeError: NrStoreError } = await import('../../../../../modules/features/js-errors/aggregate')
      api.storeError = storeError
    }
  }))
  
}

export function storeError(err: Error | String, time?: Number, internal?: any, customAttributes?: any): void {
    if (initialized && !!api.storeError) return api.storeError(err, time, internal, customAttributes)
    // if the agent has not been started, the source API method will have not been loaded...
    if (!initialized && !api.storeError) return notInitialized(NrFeatures.JSERRORS)
    // if the error feature module is disabled, this function throws a warning message
    if (initialized && !api.storeError) return isDisabled(NrFeatures.JSERRORS, 'storeError')
}

function notInitialized(featureName: NrFeatures) {
  console.warn(`You are calling a ${featureName} Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})`)
}

function isDisabled(featureName: NrFeatures, methodName: string){
  console.warn(`The ${featureName} Feature of the New Relic Browser Agent Has Been Disabled. Method "${methodName}" will not do anything!`)
}