/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var paintMetrics = {}

module.exports = {
  addMetric: addMetric,
  metrics: paintMetrics
}

function addMetric (name, value) {
  paintMetrics[name] = value
}
