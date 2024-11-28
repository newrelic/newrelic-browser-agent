/**
 * EventManager is a container for event stores. Its buffer list will expand as new dataset targets are provided by APIs.  Defaults to the configuration target.
 */
export class EventManager {
  #buffers = new Map()
  #createStore
  #defaultLookupKey

  /**
   * Create an event manager.
   * @param {Function} createStore A function that creates a new event store. Used to create a new store each time a lookup key does not match an existing store.
   * @param {*} defaultLookupKey The default key used to retrieve an event store if no key is provided.
   */
  constructor (createStore, defaultLookupKey) {
    this.#createStore = createStore
    /** @type {string} the default lookup key */
    this.#defaultLookupKey = defaultLookupKey
  }

  /**
   * Returns a boolean indicating if the lookup key is valid.
   * @param {string=} lookupKey
   * @returns
   */
  #isValidLookupKey (lookupKey) {
    return !!lookupKey && typeof lookupKey === 'string'
  }

  /**
   * Retrieves an event store for a given lookup key.
   * If a key is not supplied or is invalid, the default lookup key is used.
   * If a valid key is supplied that has never been set, a new store will be created and returned.
   * In all cases, a data store will always be returned.
   * @param {string=} lookupKey The key used to retrieve an event store. Typically a stringified object of the target metadata.
   * @returns {Object} Returns the matching event store. Event stores can be comprised of EventBuffers or EventAggregators, both of which share the same interface.
   */
  get (lookupKey) {
    if (!this.#isValidLookupKey(lookupKey)) lookupKey = this.#defaultLookupKey
    if (!this.#buffers.has(lookupKey)) this.#buffers.set(lookupKey, this.#createStore())
    return this.#buffers.get(lookupKey)
  }

  /**
   * Retrieves all created event stores.
   * @returns {[Object]} Retrieves all event stores. Event stores can be comprised of EventBuffers or EventAggregators, both of which share the same interface.
   */
  getAll () {
    return Array.from(this.#buffers, ([lookupKey, eventBuffer]) => ({ lookupKey, eventBuffer }))
  }
}
