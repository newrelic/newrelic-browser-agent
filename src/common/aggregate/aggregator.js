/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export class Aggregator {
  constructor () {
    this.aggregatedData = {}
  }

  // Items with the same type and name get aggregated together
  // params are example data from the aggregated items
  // metrics are the numeric values to be aggregated

  store (type, name, params, newMetrics, customParams, hasV2Data) {
    var bucket = this.#getBucket(type, name, params, customParams, hasV2Data)
    bucket.metrics = aggregateMetrics(newMetrics, bucket.metrics)
    return bucket
  }

  merge (type, name, metrics, params, customParams, overwriteParams = false) {
    var bucket = this.#getBucket(type, name, params, customParams)
    if (overwriteParams) bucket.params = params // replace current params with incoming params obj

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
    var bucket = this.#getBucket(type, name, params)
    bucket.stats = updateMetric(value, bucket.stats)
    return bucket
  }

  // Get all listed types buckets and it deletes the retrieved content from the aggregatedData
  take (types, deleteWhenRetrieved = true) {
    var results = {}
    var type = ''
    var hasData = false
    for (var i = 0; i < types.length; i++) {
      type = types[i]
      results[type] = Object.values(this.aggregatedData[type] || {})

      if (results[type].length) hasData = true
      if (deleteWhenRetrieved) delete this.aggregatedData[type]
    }
    return hasData ? results : null
  }

  getRequiredVersion (aggregatorTypes) {
    const results = this.take(aggregatorTypes, false)

    // Check if ANY payload in ANY array has hasV2Data === true
    if (results) {
      for (const arrayOfPayloads of Object.values(results)) {
        if (arrayOfPayloads.some(payload => payload.hasV2Data === true)) {
          return 2
        }
      }
    }

    return 1
  }

  #getBucket (type, name, params, customParams, hasV2Data) {
    if (!this.aggregatedData[type]) this.aggregatedData[type] = {}
    var bucket = this.aggregatedData[type][name]
    if (!bucket) {
      bucket = this.aggregatedData[type][name] = { params: params || {}, hasV2Data: hasV2Data || false }
      if (customParams) {
        bucket.custom = customParams
      }
    }
    if (hasV2Data) bucket.hasV2Data = true
    return bucket
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
