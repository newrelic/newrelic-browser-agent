import { NrFeatures, NrStoreError } from "../../types"
import { now } from '../../../../../modules/common/timing/now'

export class Api {
  importedMethods: { storeError: NrStoreError | null } = {
    storeError: null
  }
  private _initialized = false
  constructor(public agentIdentifier) {
    this._initialized = true
  }

  noticeError(err: Error | String, customAttributes?: Object) {
    
    if (this._initialized && !!this.importedMethods.storeError) {
      if (typeof err !== 'string' && !(err instanceof Error)) return invalidCall('noticeError', err, 'Error | String')

      err = typeof err === 'string' ? new Error(err) : err
      const time = now()
      const internal = false
      return this.importedMethods.storeError(err, time, internal, customAttributes)
    }
    // if the agent has not been started, the source API method will have not been loaded...
    if (!this._initialized && !this.importedMethods.storeError) return notInitialized(NrFeatures.JSERRORS)
    // if the error feature module is disabled, this function throws a warning message
    if (this._initialized && !this.importedMethods.storeError) return isDisabled(NrFeatures.JSERRORS, 'noticeError')
  }
}

function notInitialized(featureName: NrFeatures) {
  console.warn(`You are calling a ${featureName} Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})`)
}

function isDisabled(featureName: NrFeatures, methodName: string) {
  console.warn(`The ${featureName} Feature of the New Relic Browser Agent Has Been Disabled. Method "${methodName}" will not do anything!`)
}

function invalidCall(methodName: string, argument: any, validType: any) {
  console.warn(`"${methodName}" was called with an invalid argument: ${argument}. This method only accepts ${validType} types for that argument.`)
}