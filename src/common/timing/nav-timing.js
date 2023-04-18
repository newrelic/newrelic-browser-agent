/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// We don't use JSON.stringify directly on the performance timing data for these reasons:
// * Chrome has extra data in the performance object that we don't want to send all the time (wasteful)
// * Firefox fails to stringify the native object due to - http://code.google.com/p/v8/issues/detail?id=1223
// * The variable names are long and wasteful to transmit

// Add Performance Navigation Timing values to the given object.
// * NavTiming values are already offset from the origin time of the page
// * and should inherently never be negative

const paramMap = {
  unloadEventStart: 'u',
  redirectStart: 'r',
  unloadEventEnd: 'ue',
  redirectEnd: 're',
  fetchStart: 'f',
  domainLookupStart: 'dn',
  domainLookupEnd: 'dne',
  connectStart: 'c',
  secureConnectionStart: 's',
  connectEnd: 'ce',
  requestStart: 'rq',
  responseStart: 'rp',
  responseEnd: 'rpe',
  domLoading: 'dl',
  domInteractive: 'di',
  domContentLoadedEventStart: 'ds',
  domContentLoadedEventEnd: 'de',
  domComplete: 'dc',
  loadEventStart: 'l',
  loadEventEnd: 'le'
}

export var navTimingValues = []

export function addPT (offset, pt = {}, v = {}) {
  v.of = offset
  Object.keys(paramMap).forEach(key => handleValue(pt[key], v, paramMap[key]))
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v = {}) {
  handleValue(pn.type, v, 'ty')
  handleValue(pn.redirectCount, v, 'rc')
  return v
}

function handleValue (value, obj, prop) {
  if (!value) return
  if (typeof (value) === 'number' && (value >= 0)) {
    obj[prop] = Math.round(value)
  }
  navTimingValues.push(value)
}
