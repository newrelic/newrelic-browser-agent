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
  addLit(0, v, 'n')
  addLit(pt[UNLOAD_EVENT + START], v, 'u')
  addLit(pt[REDIRECT + START], v, 'r')
  addLit(pt[UNLOAD_EVENT + END], v, 'ue')
  addLit(pt[REDIRECT + END], v, 're')
  addLit(pt['fetch' + START], v, 'f')
  addLit(pt[DOMAIN_LOOKUP + START], v, 'dn')
  addLit(pt[DOMAIN_LOOKUP + END], v, 'dne')
  addLit(pt['c' + ONNECT + START], v, 'c')
  addLit(pt['secureC' + ONNECT + 'ion' + START], v, 's')
  addLit(pt['c' + ONNECT + END], v, 'ce')
  addLit(pt[REQUEST + START], v, 'rq')
  addLit(pt[RESPONSE + START], v, 'rp')
  addLit(pt[RESPONSE + END], v, 'rpe')
  addLit(pt.domLoading, v, 'dl')
  addLit(pt.domInteractive, v, 'di')
  addLit(pt[DOM_CONTENT_LOAD_EVENT + START], v, 'ds')
  addLit(pt[DOM_CONTENT_LOAD_EVENT + END], v, 'de')
  addLit(pt.domComplete, v, 'dc')
  addLit(pt[LOAD_EVENT + START], v, 'l')
  addLit(pt[LOAD_EVENT + END], v, 'le')
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v) {
  addRel(pn.type, v, 'ty')
  addRel(pn.redirectCount, v, 'rc')
  return v
}

function addLit (value, obj, prop) {
  if (typeof (value) === 'number' && (value >= 0)) {
    obj[prop] = Math.round(value)
  }
  navTimingValues.push(value)
}
