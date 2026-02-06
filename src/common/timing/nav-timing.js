/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
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

export const navTimingValues = []

function getPntType (type) {
  if (typeof type === 'number') return type
  const types = {
    navigate: undefined,
    reload: 1,
    back_forward: 2,
    prerender: 3
  }
  return types[type]
}

export function addPT (offset, pt, v = {}, isL1Api = false) {
  if (!pt) return
  v.of = offset
  handleValue(v.of, v, 'n', true)
  handleValue(pt[UNLOAD_EVENT + START], v, 'u', isL1Api)
  handleValue(pt[REDIRECT + START], v, 'r', isL1Api)
  handleValue(pt[UNLOAD_EVENT + END], v, 'ue', isL1Api)
  handleValue(pt[REDIRECT + END], v, 're', isL1Api)
  handleValue(pt['fetch' + START], v, 'f', isL1Api)
  handleValue(pt[DOMAIN_LOOKUP + START], v, 'dn', isL1Api)
  handleValue(pt[DOMAIN_LOOKUP + END], v, 'dne', isL1Api)
  handleValue(pt['c' + ONNECT + START], v, 'c', isL1Api)
  handleValue(pt['secureC' + ONNECT + 'ion' + START], v, 's', isL1Api)
  handleValue(pt['c' + ONNECT + END], v, 'ce', isL1Api)
  handleValue(pt[REQUEST + START], v, 'rq', isL1Api)
  handleValue(pt[RESPONSE + START], v, 'rp', isL1Api)
  handleValue(pt[RESPONSE + END], v, 'rpe', isL1Api)
  handleValue(pt.domLoading, v, 'dl', isL1Api)
  handleValue(pt.domInteractive, v, 'di', isL1Api)
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + START], v, 'ds', isL1Api)
  handleValue(pt[DOM_CONTENT_LOAD_EVENT + END], v, 'de', isL1Api)
  handleValue(pt.domComplete, v, 'dc', isL1Api)
  handleValue(pt[LOAD_EVENT + START], v, 'l', isL1Api)
  handleValue(pt[LOAD_EVENT + END], v, 'le', isL1Api)
  return v
}

// Add Performance Navigation values to the given object
export function addPN (pn, v) {
  try {
    handleValue(getPntType(pn.type), v, 'ty')
    handleValue(pn.redirectCount, v, 'rc')
  } catch (e) {
    v.ty = 0
    v.rc = 0
  }
  return v
}

/**
 * By side effect, this modifies 'obj' with a mapping of the 'prop' provided to a 'value', and invalid values are not added.
 * On the other hand, the local navTimingValues array gets the value appended if valid and 'undefined' appended if invalid, regardless.
 */
function handleValue (value, obj, prop, isOldApi) {
  /*
  For L2 Timing API, the value will already be a relative-to-previous-document DOMHighResTimeStamp.
  For L1 (deprecated) Timing, the value is an UNIX epoch timestamp, which we will convert to a relative time using our offset.
  PNT.type is reported as undefined, 1, 2, etc -- note that zero-value properties will be recorded as 'undefined', however DEM interprets undefined "types" as "navigate"
  */
  if (typeof value === 'number' && value > 0) { // note that zero-value properties will be recorded as 'undefined'
    if (isOldApi) {
      const offset = obj?.of > 0 ? obj.of : 0 // expect an epoch timestamp, if called by addPT
      value = Math.max(value - offset, 0)
    }
    value = Math.round(value)
    obj[prop] = value
    navTimingValues.push(value)
  } else navTimingValues.push(undefined)
}
