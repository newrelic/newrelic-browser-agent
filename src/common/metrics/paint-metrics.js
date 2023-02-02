/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export var paintMetrics = {};

export function addMetric(name, value) {
  paintMetrics[name] = value;
}
