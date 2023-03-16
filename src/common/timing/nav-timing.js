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

export function addPT (offset, pt, v) {
  v.of = offset
  addRel(offset, offset, v, 'n')
  addRel(pt[UNLOAD_EVENT + START], offset, v, 'u')
  addRel(pt[REDIRECT + START], offset, v, 'r')
  addRel(pt[UNLOAD_EVENT + END], offset, v, 'ue')
  addRel(pt[REDIRECT + END], offset, v, 're')
  addRel(pt['fetch' + START], offset, v, 'f')
  addRel(pt[DOMAIN_LOOKUP + START], offset, v, 'dn')
  addRel(pt[DOMAIN_LOOKUP + END], offset, v, 'dne')
  addRel(pt['c' + ONNECT + START], offset, v, 'c')
  addRel(pt['secureC' + ONNECT + 'ion' + START], offset, v, 's')
  addRel(pt['c' + ONNECT + END], offset, v, 'ce')
  addRel(pt[REQUEST + START], offset, v, 'rq')
  addRel(pt[RESPONSE + START], offset, v, 'rp')
  addRel(pt[RESPONSE + END], offset, v, 'rpe')
  addRel(pt.domLoading, offset, v, 'dl')
  addRel(pt.domInteractive, offset, v, 'di')
  addRel(pt[DOM_CONTENT_LOAD_EVENT + START], offset, v, 'ds')
  addRel(pt[DOM_CONTENT_LOAD_EVENT + END], offset, v, 'de')
  addRel(pt.domComplete, offset, v, 'dc')
  addRel(pt[LOAD_EVENT + START], offset, v, 'l')
  addRel(pt[LOAD_EVENT + END], offset, v, 'le')
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v) {
  addRel(pn.type, 0, v, 'ty')
  addRel(pn.redirectCount, 0, v, 'rc')
  return v
}

export function addRel (value, offset, obj, prop) {
  var relativeValue
  if (typeof (value) === 'number' && (value > 0)) {
    relativeValue = Math.max(Math.round(value - offset), 0)
    obj[prop] = relativeValue
  }
  navTimingValues.push(relativeValue)
}
