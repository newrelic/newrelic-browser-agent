/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// We don't use JSON.stringify directly on the performance timing data for these reasons:
// * Chrome has extra data in the performance object that we don't want to send all the time (wasteful)
// * Firefox fails to stringify the native object due to - http://code.google.com/p/v8/issues/detail?id=1223
// * The variable names are long and wasteful to transmit

// Add Performance Timing values to the given object.
// * Values are written relative to an offset to reduce their length (i.e. number of characters).
// * The offset is sent with the data
// * 0's are not included unless the value is a 'relative zero'
//

var START = 'Start'
var END = 'End'
var UNLOAD_EVENT = 'unloadEvent'
var REDIRECT = 'redirect'
var DOMAIN_LOOKUP = 'domainLookup'
var ONNECT = 'onnect'
var REQUEST = 'request'
var RESPONSE = 'response'
var LOAD_EVENT = 'loadEvent'
var DOM_CONTENT_LOAD_EVENT = 'domContentLoadedEvent'

export var navTimingValues = []

export function addPT (offset, pt, v = {}) {
  if (!pt) return
  v.of = offset
  handleValue(0, v, 'n')
  handleValue(pt[UNLOAD_EVENT + START], v, 'u')
  handleValue(pt[REDIRECT + START], v, 'r')
  handleValue(pt[UNLOAD_EVENT + END], v, 'ue')
  handleValue(pt[REDIRECT + END], v, 're')
  handleValue(pt['fetch' + START], v, 'f')
  handleValue(pt[DOMAIN_LOOKUP + START], v, 'dn')
  handleValue(pt[DOMAIN_LOOKUP + END], v, 'dne')
  handleValue(pt['c' + ONNECT + START], v, 'c')
  handleValue(pt['secureC' + ONNECT + 'ion' + START], v, 's')
  handleValue(pt['c' + ONNECT + END], v, 'ce')
  handleValue(pt[REQUEST + START], v, 'rq')
  handleValue(pt[RESPONSE + START], v, 'rp')
  handleValue(pt[RESPONSE + END], v, 'rpe')
  handleValue(pt.domLoading, v, 'dl')
  handleValue(pt.domInteractive, v, 'di')
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + START], v, 'ds')
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + END], v, 'de')
  handleValue(pt.domComplete, v, 'dc')
  handleValue(pt[LOAD_EVENT + START], v, 'l')
  handleValue(pt[LOAD_EVENT + END], v, 'le')
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v) {
  handleValue(pn.type, v, 'ty')
  handleValue(pn.redirectCount, v, 'rc')
  return v
}

function handleValue (value, obj, prop) {
  if (typeof (value) === 'number' && (value >= 0)) {
    obj[prop] = Math.round(value)
  }
  navTimingValues.push(value)
}
