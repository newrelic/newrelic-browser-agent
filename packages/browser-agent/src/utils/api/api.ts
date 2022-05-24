import { NrFeatures, NrStoreError } from "../../types"
import { now } from '@newrelic/browser-agent-core/common/timing/now'

export class Api {
  importedMethods: { storeError: NrStoreError | null } = {
    storeError: null
  }
  private _initialized = false
  private _parent: any

  constructor(parent) {
    this._initialized = true
    this._parent = parent
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
    if (!this._parent.initialized && !this.importedMethods.storeError) return notInitialized(this._parent.id, NrFeatures.JSERRORS)
    // if the error feature module is disabled, this function throws a warning message
    if (this._parent.initialized && !this.importedMethods.storeError) return isDisabled(this._parent.id, NrFeatures.JSERRORS, 'noticeError')
  }
}

function notInitialized(agentIdentifier: string, featureName: NrFeatures) {
  console.warn(`Agent ${agentIdentifier} is calling a ${featureName} Feature API, but the Browser Agent has not been started... Please start the agent using .start({...opts})`)
}

function isDisabled(agentIdentifier: string, featureName: NrFeatures, methodName: string) {
  console.warn(`The ${featureName} Feature of agent ${agentIdentifier} Has Been Disabled. Method "${methodName}" will not do anything!`)
}

function invalidCall(methodName: string, argument: any, validType: any) {
  console.warn(`"${methodName}" was called with an invalid argument: ${argument}. This method only accepts ${validType} types for that argument.`)
}