import { NrFeatures, NrStoreError } from "../../types"

let initialized = false

export const api: {noticeError: NrStoreError | null} = {
  noticeError: null
}

export async function initialize(features: NrFeatures[]){
  if (initialized) return false
  initialized = true

  return Promise.all(features.map(async feature => {
    if (feature === NrFeatures.JSERRORS) {
      const { storeError }: { storeError: NrStoreError} = await import('../../../../../modules/features/js-errors/aggregate')
      api.noticeError = storeError
    }
  }))
}

export function noticeError(err: Error | String, time?: Number, internal?: any, customAttributes?: any): void {
    if (initialized && !!api.noticeError) return api.noticeError(err, time, internal, customAttributes)
    // if the agent has not been started, the source API method will have not been loaded...
    if (!initialized && !api.noticeError) return notInitialized(NrFeatures.JSERRORS)
    // if the error feature module is disabled, this function throws a warning message
    if (initialized && !api.noticeError) return isDisabled(NrFeatures.JSERRORS, 'noticeError')
}

function notInitialized(featureName: NrFeatures) {
  console.warn(`You are calling a ${featureName} Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})`)
}

function isDisabled(featureName: NrFeatures, methodName: string){
  console.warn(`The ${featureName} Feature of the New Relic Browser Agent Has Been Disabled. Method "${methodName}" will not do anything!`)
}