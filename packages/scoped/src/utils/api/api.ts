import { NrFeatures, NrNoticeError, NrStoreError } from "../../types"
import { now } from '../../../../../modules/common/timing/now'
import { getEnabledFeatures } from "../features/features"

let initialized = false

export const importedMethods: {storeError: NrStoreError | null} = {
  storeError: null
}

export async function initialize(){
  if (initialized) return initialized
  initialized = true

  const enabledFeatures = getEnabledFeatures()

  return Promise.all(enabledFeatures.map(async feature => {
    if (feature.featureName === NrFeatures.JSERRORS) {
      const { storeError }: { storeError: NrStoreError} = await import(`../../../../../modules/features/${feature.featureName}/aggregate`)
      importedMethods.storeError = storeError
    }
    return feature.featureName
  }))
}

export const noticeError: NrNoticeError = (err, customAttributes) => {
    if (initialized && !!importedMethods.storeError) {
      if (typeof err !== 'string' && !(err instanceof Error)) return invalidCall('noticeError', err, 'Error | String')
      
      err = typeof err === 'string' ? new Error(err) : err
      const time = now()
      const internal = false
      return importedMethods.storeError(err, time, internal, customAttributes)
    }
    // if the agent has not been started, the source API method will have not been loaded...
    if (!initialized && !importedMethods.storeError) return notInitialized(NrFeatures.JSERRORS)
    // if the error feature module is disabled, this function throws a warning message
    if (initialized && !importedMethods.storeError) return isDisabled(NrFeatures.JSERRORS, 'noticeError')
}

function notInitialized(featureName: NrFeatures) {
  console.warn(`You are calling a ${featureName} Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})`)
}

function isDisabled(featureName: NrFeatures, methodName: string){
  console.warn(`The ${featureName} Feature of the New Relic Browser Agent Has Been Disabled. Method "${methodName}" will not do anything!`)
}

function invalidCall(methodName: string, argument: any, validType: any){
  console.warn(`"${methodName}" was called with an invalid argument: ${argument}. This method only accepts ${validType} types for that argument.`)
}