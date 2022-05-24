/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var mapOwn = require('map-own')

var aggregatedData = {}

module.exports = {
  store: storeEventMetrics,
  storeMetric: storeMetric,
  take: take,
  get: get,
  merge: mergeMetrics
}

// Items with the same type and name get aggregated together
// params are example data from the aggregated items
// metrics are the numeric values to be aggregated

// store a single metric not tied to an event, metric values are stored in a single `stats` object property
function storeMetric (type, name, params, value) {
  var bucket = getBucket(type, name, params)
  bucket.stats = updateMetric(value, bucket.stats)
  return bucket
}

// store multiple metrics tied to an event, metrics are stored in a `metrics` property (map of name-stats metrics)
function storeEventMetrics (type, name, params, newMetrics, customParams) {
  var bucket = getBucket(type, name, params, customParams)
  bucket.metrics = aggregateMetrics(newMetrics, bucket.metrics)
  return bucket
}

function aggregateMetrics (newMetrics, oldMetrics) {
  if (!oldMetrics) oldMetrics = {count: 0}
  oldMetrics.count += 1
  mapOwn(newMetrics, function (key, value) {
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
  if (!metric) return {t: value}

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

function updateCounterMetric(metric) {
  if (!metric) {
    metric = {c: 1}
  } else {
    metric.c++
  }
  return metric
}

/**
 * Merge metrics object into existing metrics.
 *
 * @param {string} type
 * @param {string} name
 * @param {object} metrics - Metrics to merge.
 */
function mergeMetrics (type, name, metrics, params, customParams) {
  var bucket = getBucket(type, name, params, customParams)

  if (!bucket.metrics) {
    bucket.metrics = metrics
    return
  }

  var oldMetrics = bucket.metrics
  oldMetrics.count += metrics.count

  // iterate through each new metric and merge
  mapOwn(metrics, function (key, value) {
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

function mergeMetric(newMetric, oldMetric) {
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

function getBucket (type, name, params, customParams) {
  if (!aggregatedData[type]) aggregatedData[type] = {}
  var bucket = aggregatedData[type][name]
  if (!bucket) {
    bucket = aggregatedData[type][name] = { params: params || {} }
    if (customParams) {
      bucket.custom = customParams
    }
  }
  return bucket
}

function get (type, name) {
  // if name is passed, get a single bucket
  if (name) return aggregatedData[type] && aggregatedData[type][name]
  // else, get all buckets of that type
  return aggregatedData[type]
}

// Like get, but for many types and it deletes the retrieved content from the aggregatedData
function take (types) {
  var results = {}
  var type = ''
  var hasData = false
  for (var i = 0; i < types.length; i++) {
    type = types[i]
    results[type] = toArray(aggregatedData[type])
    if (results[type].length) hasData = true
    delete aggregatedData[type]
  }
  return hasData ? results : null
}

function toArray (obj) {
  if (typeof obj !== 'object') return []

  return mapOwn(obj, getValue)
}

function getValue (key, value) {
  return value
}
