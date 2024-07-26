/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedContext } from '../context/shared-context'

export class Aggregator extends SharedContext {
  constructor (parent) {
    super(parent)
    this.aggregatedData = {}
  }

  // Items with the same type and name get aggregated together
  // params are example data from the aggregated items
  // metrics are the numeric values to be aggregated

  store (type, name, params, newMetrics, customParams) {
    var bucket = this.getBucket(type, name, params, customParams)
    bucket.metrics = aggregateMetrics(newMetrics, bucket.metrics)
    return bucket
  }

  merge (type, name, metrics, params, customParams) {
    var bucket = this.getBucket(type, name, params, customParams)

    if (!bucket.metrics) {
      bucket.metrics = metrics
      return
    }

    var oldMetrics = bucket.metrics
    oldMetrics.count += metrics.count

    // iterate through each new metric and merge
    Object.keys(metrics || {}).forEach((key) => {
      // count is a special case handled above
      if (key === 'count') return

      var oldMetric = oldMetrics[key]
      var newMetric = metrics[key]

      // handling the case where newMetric is a single-value first
      if (newMetric && !newMetric.c) {
        oldMetrics[key] = updateMetric(newMetric.t, oldMetric)
      } else { // newMetric is a metric object
        oldMetrics[key] = mergeMetric(newMetric, oldMetrics[key])
      }
    })
  }

  storeMetric (type, name, params, value) {
    var bucket = this.getBucket(type, name, params)
    bucket.stats = updateMetric(value, bucket.stats)
    return bucket
  }

  getBucket (type, name, params, customParams) {
    if (!this.aggregatedData[type]) this.aggregatedData[type] = {}
    var bucket = this.aggregatedData[type][name]
    if (!bucket) {
      bucket = this.aggregatedData[type][name] = { params: params || {} }
      if (customParams) {
        bucket.custom = customParams
      }
    }
    return bucket
  }

  get (type, name) {
    // if name is passed, get a single bucket
    if (name) return this.aggregatedData[type] && this.aggregatedData[type][name]
    // else, get all buckets of that type
    return this.aggregatedData[type]
  }

  // Like get, but for many types and it deletes the retrieved content from the aggregatedData
  take (types) {
    var results = {}
    var type = ''
    var hasData = false
    for (var i = 0; i < types.length; i++) {
      type = types[i]
      results[type] = Object.values(this.aggregatedData[type] || {})

      if (results[type].length) hasData = true
      delete this.aggregatedData[type]
    }
    return hasData ? results : null
  }
}

function aggregateMetrics (newMetrics, oldMetrics) {
  if (!oldMetrics) oldMetrics = { count: 0 }
  oldMetrics.count += 1
  Object.entries(newMetrics || {}).forEach(([key, value]) => {
    oldMetrics[key] = updateMetric(value, oldMetrics[key])
  })
  return oldMetrics
}

function updateMetric (value, metric) {
  // when there is no value, then send only count
  if (value == null) {
    return updateCounterMetric(metric)
  }

  // When there is only one data point, the c (count), min, max, and sos (sum of squares) params are superfluous.
  if (!metric) return { t: value }

  // but on the second data point, we need to calculate the other values before aggregating in new values
  if (!metric.c) {
    metric = createMetricObject(metric.t)
  }

  // at this point, metric is always uncondensed
  metric.c += 1
  metric.t += value
  metric.sos += value * value
  if (value > metric.max) metric.max = value
  if (value < metric.min) metric.min = value

  return metric
}

function updateCounterMetric (metric) {
  if (!metric) {
    metric = { c: 1 }
  } else {
    metric.c++
  }
  return metric
}

function mergeMetric (newMetric, oldMetric) {
  if (!oldMetric) return newMetric

  if (!oldMetric.c) {
    // oldMetric is a single-value
    oldMetric = createMetricObject(oldMetric.t)
  }

  oldMetric.min = Math.min(newMetric.min, oldMetric.min)
  oldMetric.max = Math.max(newMetric.max, oldMetric.max)
  oldMetric.t += newMetric.t
  oldMetric.sos += newMetric.sos
  oldMetric.c += newMetric.c

  return oldMetric
}

// take a value and create a metric object
function createMetricObject (value) {
  return {
    t: value,
    min: value,
    max: value,
    sos: value * value,
    c: 1
  }
}
