import { gosNREUM } from '../window/nreum'
import { bundleId } from '../ids/bundle-id'
import { EventContext } from './event-context'

export class ObservationContextManager {
  // These IDs are provided for backwards compatibility until the agent is fully updated
  // use the observation context class.

  static contextId = `nr@context:${bundleId}`
  static contextOriginalId = `nr@original:${bundleId}`
  static contextWrappedId = `nr@wrapped:${ObservationContextManager.contextId}`

  static getObservationContextByAgentIdentifier (agentIdentifier) {
    const nr = gosNREUM()
    return Object.keys(nr?.initializedAgents || {}).indexOf(agentIdentifier) > -1
      ? nr.initializedAgents[agentIdentifier].observationContext
      : undefined
  }

  /**
   * @type {WeakMap<WeakKey, {[key: string]: unknown}>}
   */
  #observationContext = new WeakMap()

  /**
   * Returns the observation context tied to the supplied construct. If there has been
   * no observation construct created, an empty object is created and stored as the current
   * context.
   * @param key {unknown} The construct being observed such as an XHR instance
   * @return {EventContext} An object of key:value pairs to track as
   * part of the observation
   */
  getCreateContext (key) {
    if (!this.#observationContext.has(key)) {
      this.#observationContext.set(key, new EventContext())
    }

    return this.#observationContext.get(key)
  }

  /**
   * Set the observation context for an observed construct. If values of the context
   * need to be updated, they should be done so directly on the context. This function
   * is only for the setting of a whole context.
   * @param key {unknown} The construct being observed such as an XHR instance
   * @param value {EventContext} An object of key:value pairs to track as
   * part of the observation
   * @return {EventContext} The updated observation context
   */
  setContext (key, value) {
    this.#observationContext.set(key, value)

    return this.#observationContext.get(key)
  }
}
