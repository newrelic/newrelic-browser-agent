/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var runtimeConfiguration = {
  origin: '' + window.location
}

var info = {}

module.exports = {
  getConfiguration: getConfiguration,
  setConfiguration: setConfiguration,
  getInfo: getInfo,
  setInfo: setInfo,
  runtime: runtimeConfiguration
}

function getConfiguration(path) {
  if (!NREUM.init) return
  var val = NREUM.init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    val = val[parts[i]]
    if (typeof val !== 'object') return
  }
  val = val[parts[parts.length - 1]]
  return val
}

function setConfiguration(path, newValue) {
  window.NREUM = window.NREUM || {}

  if (!NREUM.init) {
    NREUM.init = {}
  }
  var val = NREUM.init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    if (typeof val[parts[i]] === 'undefined') {
      val[parts[i]] = {}
    }
    val = val[parts[i]]
  }
  val[parts[parts.length - 1]] = newValue
}

function getInfo() {
  // if (window.NREUM && window.NREUM.info) {
  //   return window.NREUM.info
  // }
  // return {}
  return info
}

function setInfo(obj) {
  // no longer global
  // window.NREUM = window.NREUM || {}
  // window.NREUM.info = info = window.NREUM.info || {}

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

  // TODO: there are others
}
