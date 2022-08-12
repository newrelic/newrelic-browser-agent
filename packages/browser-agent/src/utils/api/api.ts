import { NrFeatures, NrStoreError, NrAddPageAction } from "../../types"
import { now } from '@newrelic/browser-agent-core/common/timing/now'
import { ee } from '@newrelic/browser-agent-core/common/event-emitter/contextual-ee'

export class Api {
  importedMethods: { storeError: NrStoreError | null, addPageAction: NrAddPageAction | null } = {
    storeError: null,
    addPageAction: null,
  }
  private _initialized = false
  private _parent: any
  private _ee: any

  constructor(parent) {
    this._initialized = true
    this._parent = parent
    this._ee = ee.get(this._parent._id)
  }

  noticeError(err: Error | String, customAttributes?: Object) {
    const time = now()

    // if the agent has not been started, the source API method will have not been loaded...
    if (!this._parent.initialized) return notInitialized(this._parent.id, NrFeatures.JSERRORS)

    if (this._initialized && !!this.importedMethods.storeError) {
      if (typeof err !== 'string' && !(err instanceof Error)) return invalidCall('noticeError', err, 'Error | String')

      err = typeof err === 'string' ? new Error(err) : err
      const internal = false
      this._ee.emit('record-supportability', ['API/noticeError/called'])
      return this.importedMethods.storeError(err, time, internal, customAttributes)
    }
 
    // if the error feature module is disabled, this function throws a warning message
    if (this._parent.initialized && !this.importedMethods.storeError) return isDisabled(this._parent.id, NrFeatures.JSERRORS, 'noticeError')
  }

  addPageAction(name: String, customAttributes?: Object) {
    const time = now()

    // if the agent has not been started, the source API method will have not been loaded...
    if (!this._parent.initialized) return notInitialized(this._parent.id, NrFeatures.PAGE_ACTION)

    if (this._initialized && !!this.importedMethods.addPageAction) {
      if (!validateAddPageAction(arguments)) return

      this._ee.emit('record-supportability', ['API/addPageAction/called'])
      return this.importedMethods.addPageAction(time, name, customAttributes)
    }

    // if the PageAction feature module is disabled, this function throws a warning message
    if (this._parent.initialized && !this.importedMethods.addPageAction) return isDisabled(this._parent.id, NrFeatures.PAGE_ACTION, 'addPageAction')

    function validateAddPageAction(args) {
      if (!args[0] || typeof args[0] !== 'string') return invalidCall('addPageAction', args[0], 'String')
      // matches core module's addPageAction attribute validation
      if (args[1] && typeof args[1] !== 'object') return invalidCall('addPageAction', args[1], 'Object')
      
      return true
    }
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