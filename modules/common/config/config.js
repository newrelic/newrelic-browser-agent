/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { gosNREUMOriginals, defaults as nrDefaults} from "../window/nreum"
import { ieVersion } from "../browser-version/ie-version"
import { getLastTimestamp } from "../timing/now"
import { BUILD } from "../constants/environment-variables"

var originalMethods = gosNREUMOriginals().o

var runtimeConfiguration = {
  build: BUILD,
  origin: '' + window.location,
  maxBytes: ieVersion === 6 ? 2000 : 30000,
  offset: getLastTimestamp(),
  features: {}
}

var info = {beacon: nrDefaults.beacon, errorBeacon: nrDefaults.errorBeacon}
var init = {}
var loader_config = {}

export { runtimeConfiguration as runtime }

export { originalMethods as originals }

export function getConfiguration() {
  return init
}

export function setConfiguration(configuration) {
  init = configuration
}

export function getConfigurationValue(path) {
  var val = init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    val = val[parts[i]]
    if (typeof val !== 'object') return
  }
  val = val[parts[parts.length - 1]]
  console.log("val...(",path,")", val)
  return val
}

export function setConfigurationValue(path, newValue) {
  var val = init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    if (typeof val[parts[i]] === 'undefined') {
      val[parts[i]] = {}
    }
    val = val[parts[i]]
  }
  val[parts[parts.length - 1]] = newValue
}

export function getInfo() {
  // if (window.NREUM && window.NREUM.info) {
  //   return window.NREUM.info
  // }
  // return {}
  return info
}

export function setInfo(obj) {
  console.log("SET INFO!!!!", obj)
  if (obj.licenseKey) {
    info.licenseKey = obj.licenseKey
  }

  if (obj.beaconUrl) {
    info.beacon = obj.beaconUrl
    info.errorBeacon = obj.beaconUrl
  }

  if (obj.beacon) {
    info.beacon = obj.beacon
  }

  if (obj.errorBeacon) {
    info.errorBeacon = obj.errorBeacon
  }

  if (obj.appId) {
    info.applicationID = obj.appId
  }

  if (obj.applicationID) {
    info.applicationID = obj.applicationID
  }

  if (obj.jsAttributes) {
    info.jsAttributes = obj.jsAttributes
  }

  if (obj.userAttributes) {
    info.userAttributes = obj.userAttributes
  }

  if (obj.atts) {
    info.atts = obj.atts
  }

  // TODO: there are others
}

export function getLoaderConfig() {
  // if (window.NREUM && window.NREUM.info) {
  //   return window.NREUM.info
  // }
  // return {}
  return loader_config
}

export function setLoaderConfig(obj) {
  loader_config = obj

  // TODO: clean up
}