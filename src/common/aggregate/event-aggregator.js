/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Aggregator } from './aggregator'

/**
 * An extension of the Aggregator class that provides an interface similar to that of EventBuffer class.
 * This typecasting allow features that uses Aggregator as their event handler to share the same AggregateBase.events utilization by those features.
 */
export class EventAggregator {
  #aggregator = new Aggregator()
  #savedNamesToBuckets = {}

  isEmpty ({ aggregatorTypes }) {
    if (!aggregatorTypes) return Object.keys(this.#aggregator.aggregatedData).length === 0
    return aggregatorTypes.every(type => !this.#aggregator.aggregatedData[type]) // no bucket exist for any of the types we're looking for
  }

  add ([type, name, params, newMetrics, customParams]) {
    // Do we need to track byte size here like EventBuffer?
    this.#aggregator.store(type, name, params, newMetrics, customParams)
    return true
  }

  addMetric (type, name, params, value) {
    this.#aggregator.storeMetric(type, name, params, value)
    return true
  }

  save ({ aggregatorTypes }) {
    const key = aggregatorTypes.toString() // the stringified types serve as the key to each save call, e.g. ['err', 'ierr', 'xhr'] => 'err,ierr,xhr'
    const backupAggregatedDataSubset = {}
    aggregatorTypes.forEach(type => (backupAggregatedDataSubset[type] = this.#aggregator.aggregatedData[type])) // make a subset of the aggregatedData for each of the types we want to save
    this.#savedNamesToBuckets[key] = backupAggregatedDataSubset
    /*
    { 'err,ierr,xhr': {
        'err': {
            <aggregateHash>: { metrics: { count: 1, time, ... }, params: {}, custom: {} },
            <otherHashName>: { metrics: { count: 1, ... }, ... }
        },
        'ierr': { ... },
        'xhr': { ... }
      }
    }
    */
  }

  get (opts) {
    const aggregatorTypes = Array.isArray(opts) ? opts : opts.aggregatorTypes
    return this.#aggregator.take(aggregatorTypes, false)
  }

  clear ({ aggregatorTypes } = {}) {
    if (!aggregatorTypes) {
      this.#aggregator.aggregatedData = {}
      return
    }
    aggregatorTypes.forEach(type => delete this.#aggregator.aggregatedData[type])
  }

  reloadSave ({ aggregatorTypes } = {}) {
    const key = aggregatorTypes.toString()
    const backupAggregatedDataSubset = this.#savedNamesToBuckets[key]
    // Grabs the previously stored subset and merge it back into aggregatedData.
    aggregatorTypes.forEach(type => {
      Object.keys(backupAggregatedDataSubset[type] || {}).forEach(name => {
        const bucket = backupAggregatedDataSubset[type][name]
        // The older aka saved params take effect over the newer one. This is especially important when merging back for a failed harvest retry if, for example,
        // the first-ever occurrence of an error is in the retry: it contains the params.stack_trace whereas the newer or current bucket.params would not.
        this.#aggregator.merge(type, name, bucket.metrics, bucket.params, bucket.custom, true)
      })
    })
  }

  clearSave ({ aggregatorTypes } = {}) {
    const key = aggregatorTypes.toString()
    delete this.#savedNamesToBuckets[key]
  }
}
