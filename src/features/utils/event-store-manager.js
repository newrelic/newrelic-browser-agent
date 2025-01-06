import { EventAggregator } from '../../common/aggregate/event-aggregator'
import { EventBuffer } from './event-buffer'

/**
 * This layer allows multiple browser entity apps, or "target", to each have their own segregated storage instance.
 * The purpose is so the harvester can send data to different apps within the same agent. Each feature should have a manager if it needs this capability.
 */
export class EventStoreManager {
  /**
   * @param {object} defaultTarget - should contain licenseKey and appId of the main app from NREUM.info at startup
   * @param {1|2} storageChoice - the type of storage to use in this manager; 'EventBuffer' (1), 'EventAggregator' (2)
   */
  constructor (defaultTarget, storageChoice) {
    this.mainApp = defaultTarget
    this.StorageClass = storageChoice === 1 ? EventBuffer : EventAggregator
    this.appStorageMap = new Map()
    this.appStorageMap.set(defaultTarget, new this.StorageClass())
  }

  // This class must contain an union of all methods from all supported storage classes and conceptualize away the target app argument.

  /**
   * @param {object} optsIfPresent - exists if called during harvest interval, @see AggregateBase.makeHarvestPayload
   * @param {object} target - specific app's storage to check; if not provided, this method takes into account all apps recorded by this manager
   * @returns {boolean} True if the target's storage is empty (defaults to all storages)
   */
  isEmpty (optsIfPresent, target) {
    if (target) return this.appStorageMap.get(target)?.isEmpty(optsIfPresent)
    for (const eventStore of this.appStorageMap.values()) {
      if (!eventStore.isEmpty(optsIfPresent)) return false
    }
    return true
  }

  /**
   * @param {string} event - the event element to store
   * @param {object} target - the app to store event under; if not provided, this method adds to the main app from NREUM.info
   * @returns {boolean} True if the event was successfully added
   */
  add (event, target) {
    if (target && !this.appStorageMap.has(target)) this.appStorageMap.set(target, new this.StorageClass())
    return this.appStorageMap.get(target || this.mainApp).add(event)
  }

  /** This is only used by the Metrics feature which has no need to add metric under a different app atm. */
  addMetric (type, name, params, value) {
    return this.appStorageMap.get(this.mainApp).addMetric(type, name, params, value)
  }

  /**
   * @param {object} optsIfPresent - exists if called during harvest interval, @see AggregateBase.makeHarvestPayload
   * @param {object} target - specific app to fetch; if not provided, this method fetches from all apps
   * @returns {Array} Objects of `data` labeled with their respective `target` app to be sent to
   */
  get (optsIfPresent, target) {
    if (target) return [{ targetApp: target, data: this.appStorageMap.get(target)?.get(optsIfPresent) }]
    const allPayloads = []
    this.appStorageMap.forEach((eventStore, recordedTarget) => {
      allPayloads.push({ targetApp: recordedTarget, data: eventStore.get(optsIfPresent) })
    })
    return allPayloads
  }

  byteSize (target) {
    return this.appStorageMap.get(target || this.mainApp).byteSize()
  }

  wouldExceedMaxSize (incomingSize, target) {
    return this.appStorageMap.get(target || this.mainApp).wouldExceedMaxSize(incomingSize)
  }

  save (optsIfPresent, target) {
    if (target) return this.appStorageMap.get(target)?.save(optsIfPresent)
    this.appStorageMap.forEach((eventStore) => eventStore.save(optsIfPresent))
  }

  clear (optsIfPresent, target) {
    if (target) return this.appStorageMap.get(target)?.clear(optsIfPresent)
    this.appStorageMap.forEach((eventStore) => eventStore.clear(optsIfPresent))
  }

  // Unlike the methods above, the following will have a target as they are called by AggregateBase.postHarvestCleanup callback on harvest finish after getting & sending the data.
  reloadSave (optsIfPresent, target) {
    if (!target) { // -- remove this block once the old harvest.js & harvest-schedule.js are deleted!
      this.appStorageMap.forEach((eventStore) => eventStore.reloadSave(optsIfPresent))
      return
    }
    return this.appStorageMap.get(target)?.reloadSave(optsIfPresent)
  }

  clearSave (optsIfPresent, target) {
    if (!target) { // -- remove this block once the old harvest.js & harvest-schedule.js are deleted!
      this.appStorageMap.forEach((eventStore) => eventStore.clearSave(optsIfPresent))
      return
    }
    return this.appStorageMap.get(target)?.clearSave(optsIfPresent)
  }
}
