import { gosNREUM } from '../window/nreum'

export class ObservationContext {
  static getObservationContextByAgentIdentifier (agentIdentifier) {
    const nr = gosNREUM()
    return Object.keys(nr?.initializedAgents || {}).indexOf(agentIdentifier) > -1
      ? nr.initializedAgents[agentIdentifier].observationContext
      : undefined
  }

  #observationContext = new WeakMap()

  getContext (key) {
    return this.#observationContext.get(key)
  }

  setContext (key, value) {
    this.#observationContext.set(key, value)
  }
}
