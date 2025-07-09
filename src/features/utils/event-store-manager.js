/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { DEFAULT_KEY, MAX_PAYLOAD_SIZE } from '../../common/constants/agent-constants'
import { dispatchGlobalEvent } from '../../common/dispatch/global-event'
import { activatedFeatures } from '../../common/util/feature-flags'
import { isContainerAgentTarget } from '../../common/util/target'
/**
 * This layer allows multiple browser entity apps, or "target", to each have their own segregated storage instance.
 * The purpose is so the harvester can send data to different apps within the same agent. Each feature should have a manager if it needs this capability.
 */
export class EventStoreManager {
  /**
   * @param {object} agentRef - reference to base agent class
   * @param {EventBuffer|EventAggregator} storageClass - the type of storage to use in this manager; 'EventBuffer' (1), 'EventAggregator' (2)
   * @param {string} [defaultEntityGuid] - the entity guid to use as the default storage instance; if not provided, a new one is created
   * @param {Object} featureAgg - the feature aggregate instance that initialized this manager
   */
  constructor (agentRef, storageClass, defaultEntityGuid, featureAgg) {
    this.agentRef = agentRef
    this.entityManager = agentRef.runtime.entityManager
    this.StorageClass = storageClass
    this.appStorageMap = new Map([[DEFAULT_KEY, new this.StorageClass(MAX_PAYLOAD_SIZE, featureAgg)]])
    this.featureAgg = featureAgg
    this.setEventStore(defaultEntityGuid)
  }

  /**
   * Always returns a storage instance.  Creates one if one does not exist.  If a lookup is not provided, uses the DEFAULT namespace
   * @param {string=} targetEntityGuid the lookup
   * @returns {*} ALWAYS returns a storage instance
   */
  #getEventStore (targetEntityGuid = DEFAULT_KEY) {
    if (!this.appStorageMap.has(targetEntityGuid)) this.setEventStore(targetEntityGuid)
    return this.appStorageMap.get(targetEntityGuid)
  }

  setEventStore (targetEntityGuid) {
    /** we should already have an event store for the default */
    if (!targetEntityGuid) return
    /** if the target is the container agent, SHARE the default storage -- otherwise create a new event store */
    const eventStorage = (isContainerAgentTarget(this.entityManager.get(targetEntityGuid), this.agentRef))
      ? this.appStorageMap.get(DEFAULT_KEY)
      : new this.StorageClass(MAX_PAYLOAD_SIZE, this.featureAgg)
    this.appStorageMap.set(targetEntityGuid, eventStorage)
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
    dispatchGlobalEvent({
      agentIdentifier: this.agentRef.agentIdentifier,
      drained: !!activatedFeatures?.[this.agentRef.agentIdentifier],
      type: 'data',
      name: 'buffer',
      feature: this.featureAgg.featureName,
      data: event
    })
    return this.#getEventStore(targetEntityGuid).add(event)
  }

  /** This is only used by the Metrics feature which has no need to add metric under a different app atm. */
  addMetric (type, name, params, value) {
    return this.#getEventStore().addMetric(type, name, params, value)
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
      // We shouldnt harvest unless we have a valid entity guid.  It was ONLY stored under the default key temporarily
      // until a real key was returned in the RUM call. The real key SHARES the event store with the default key, and
      // should be the key that is honored to get the event store to ensure a valid connection was made.
      if (targetEntityGuid === DEFAULT_KEY) return
      const targetApp = this.entityManager.get(targetEntityGuid)
      // const data = eventStore.get(opts)
      // if (targetApp && (data.length || Object.keys(data).some(key => data[key].length))) allPayloads.push({ targetApp, data })
      if (targetApp) allPayloads.push({ targetApp, data: eventStore.get(opts) })
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
