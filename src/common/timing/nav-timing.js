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

export function addPT (offset, pt, v = {}, isLegacy) {
  if (!pt) return
  v.of = offset
  handleValue(0, v, 'n')
  handleValue(pt[UNLOAD_EVENT + START], v, 'u', isLegacy && offset)
  handleValue(pt[REDIRECT + START], v, 'r', isLegacy && offset)
  handleValue(pt[UNLOAD_EVENT + END], v, 'ue', isLegacy && offset)
  handleValue(pt[REDIRECT + END], v, 're', isLegacy && offset)
  handleValue(pt['fetch' + START], v, 'f', isLegacy && offset)
  handleValue(pt[DOMAIN_LOOKUP + START], v, 'dn', isLegacy && offset)
  handleValue(pt[DOMAIN_LOOKUP + END], v, 'dne', isLegacy && offset)
  handleValue(pt['c' + ONNECT + START], v, 'c', isLegacy && offset)
  handleValue(pt['secureC' + ONNECT + 'ion' + START], v, 's', isLegacy && offset)
  handleValue(pt['c' + ONNECT + END], v, 'ce', isLegacy && offset)
  handleValue(pt[REQUEST + START], v, 'rq', isLegacy && offset)
  handleValue(pt[RESPONSE + START], v, 'rp', isLegacy && offset)
  handleValue(pt[RESPONSE + END], v, 'rpe', isLegacy && offset)
  handleValue(pt.domLoading, v, 'dl', isLegacy && offset)
  handleValue(pt.domInteractive, v, 'di', isLegacy && offset)
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + START], v, 'ds', isLegacy && offset)
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + END], v, 'de', isLegacy && offset)
  handleValue(pt.domComplete, v, 'dc', isLegacy && offset)
  handleValue(pt[LOAD_EVENT + START], v, 'l', isLegacy && offset)
  handleValue(pt[LOAD_EVENT + END], v, 'le', isLegacy && offset)
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v) {
  handleValue(pn.type, v, 'ty')
  handleValue(pn.redirectCount, v, 'rc')
  return v
}

function handleValue (value, obj, prop, offset) {
  let val
  if (typeof (value) === 'number' && (value >= 0 || (!!offset && value > 0))) {
    val = offset ? Math.max(Math.round(value - offset), 0) : value
    obj[prop] = Math.round(val)
  }
  navTimingValues.push(val)
}
