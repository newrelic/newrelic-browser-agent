/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var hasProcess = typeof process !== "undefined" && process && process.hrtime;

function now() {
  if (hasProcess) {
    var time = process.hrtime();
    return Math.round((time[0] * 1e9 + time[1]) / 1e6);
  }
  return Date.now();
}

module.exports = now;
