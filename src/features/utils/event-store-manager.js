import { DEFAULT_ENTITY } from './entity-manager'

/**
 * This layer allows multiple browser entity apps, or "target", to each have their own segregated storage instance.
 * The purpose is so the harvester can send data to different apps within the same agent. Each feature should have a manager if it needs this capability.
 */
export class EventStoreManager {
  /**
   * @param {object} agentRef - reference to base agent class
   * @param {EventBuffer|EventAggregator} storageClass - the type of storage to use in this manager; 'EventBuffer' (1), 'EventAggregator' (2)
   */
  constructor (agentRef, storageClass) {
    this.entityManager = agentRef.runtime.entityManager
    this.StorageClass = storageClass
    this.appStorageMap = new Map()
    this.defaultEventStore = this.#getEventStore()
  }

  /**
   * Always returns a storage instance.  Creates one if one does not exist.  If a lookup is not provided, uses the DEFAULT namespace
   * @param {string} targetEntityGuid the lookup
   * @returns {*} ALWAYS returns a storage instance
   */
  #getEventStore (targetEntityGuid = DEFAULT_ENTITY) {
    if (!this.appStorageMap.has(targetEntityGuid)) this.appStorageMap.set(targetEntityGuid, new this.StorageClass())
    return this.appStorageMap.get(targetEntityGuid)
  }

  // This class must contain an union of all methods from all supported storage classes and conceptualize away the target app argument.

  /**
   * Calls the isEmpty method on the underlying storage class. If target is provided, runs just for the target, otherwise runs for all apps.
   * @param {object} optsIfPresent - exists if called during harvest interval, @see AggregateBase.makeHarvestPayload
   * @param {object} target - specific app's storage to check; if not provided, this method takes into account all apps recorded by this manager
   * @returns {boolean} True if the target's storage is empty, or target does not exist in map (defaults to all storages)
   */
  isEmpty (optsIfPresent, targetEntityGuid) {
    if (targetEntityGuid) return this.#getEventStore(targetEntityGuid).isEmpty(optsIfPresent)

    for (const eventStore of this.appStorageMap.values()) {
      if (!eventStore.isEmpty(optsIfPresent)) return false
    }
    return true
  }

  /**
   * Calls the add method on the underlying storage class.
   * @param {string} event - the event element to store
   * @param {object} targetEntityGuid - the entity guid lookup to store event under; if not provided, this method adds to the default
   * @returns {boolean} True if the event was successfully added
   */
  add (event, targetEntityGuid) {
    console.log('ESM add called', event, targetEntityGuid)
    console.log('event store is', this.#getEventStore(targetEntityGuid))
    return this.#getEventStore(targetEntityGuid).add(event)
  }

  /** This is only used by the Metrics feature which has no need to add metric under a different app atm. */
  addMetric (type, name, params, value) {
    return this.#getEventStore(DEFAULT_ENTITY).addMetric(type, name, params, value)
  }

  /**
   * Calls the get method on the underlying storage class. If target is provided, runs just for the target, otherwise runs for all apps.
   * @param {object=} opts - exists if called during harvest interval, @see AggregateBase.makeHarvestPayload
   * @param {object=} target - specific app to fetch; if not provided, this method fetches from all apps
   * @returns {Array} Objects of `data` labeled with their respective `target` app to be sent to
   */
  get (opts, targetEntityGuid) {
    if (targetEntityGuid) return [{ targetApp: this.entityManager.get(targetEntityGuid), data: this.#getEventStore(targetEntityGuid).get(opts) }]

    const allPayloads = []
    this.appStorageMap.forEach((eventStore, targetEntityGuid) => {
      allPayloads.push({ targetApp: this.entityManager.get(targetEntityGuid), data: eventStore.get(opts) })
    })
    return allPayloads
  }

  /**
   * Calls the byteSize method on the underlying storage class
   * @param {*} targetEntityGuid
   * @returns
   */
  byteSize (targetEntityGuid) {
    return this.#getEventStore(targetEntityGuid).byteSize()
  }

  /**
   * Calls the wouldExceedMaxSize method on the underlying storage class
   * @param {*} incomingSize
   * @param {*} targetEntityGuid
   * @returns
   */
  wouldExceedMaxSize (incomingSize, targetEntityGuid) {
    return this.#getEventStore(targetEntityGuid).wouldExceedMaxSize(incomingSize)
  }

  /**
   * Calls the save method on the underlying storage class. If target is provided, runs just for the target, otherwise runs for all apps.
   * @param {*} optsIfPresent
   * @param {*} targetEntityGuid
   * @returns
   */
  save (optsIfPresent, targetEntityGuid) {
    if (targetEntityGuid) return this.#getEventStore(targetEntityGuid).save(optsIfPresent)
    this.appStorageMap.forEach((eventStore) => eventStore.save(optsIfPresent))
  }

  /**
   * Calls the clear method on the underlying storage class. If target is provided, runs just for the target, otherwise runs for all apps.
   * @param {*} optsIfPresent
   * @param {*} targetEntityGuid
   * @returns
   */
  clear (optsIfPresent, targetEntityGuid) {
    if (targetEntityGuid) return this.#getEventStore(targetEntityGuid).clear(optsIfPresent)
    this.appStorageMap.forEach((eventStore) => eventStore.clear(optsIfPresent))
  }

  // Unlike the methods above, the following will have a target as they are called by AggregateBase.postHarvestCleanup callback on harvest finish after getting & sending the data.
  reloadSave (optsIfPresent, targetEntityGuid) {
    return this.#getEventStore(targetEntityGuid).reloadSave(optsIfPresent)
  }

  clearSave (optsIfPresent, targetEntityGuid) {
    return this.#getEventStore(targetEntityGuid).clearSave(optsIfPresent)
  }
}
