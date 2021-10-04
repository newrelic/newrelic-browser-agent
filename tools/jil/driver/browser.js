/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const eventListenerOpts = require('event-listener-opts')
const testDriver = require('../browser-test')

var loadQueue = []
// using es6 export breaks old ie
module.exports = { test, browserTest, loaded: false, onWindowLoaded, isEdge }

function test () {}

function browserTest (name, spec, test) {
  if (!test && typeof spec === 'function') {
    test = spec
    spec = null
  }

  testDriver(name, test)
}

window.addEventListener
  ? window.addEventListener('load', loaded, eventListenerOpts(false))
  : window.attachEvent('onload', loaded)

function loaded () {
  module.exports.loaded = true
  for (var i = 0; i < loadQueue.length; ++i) {
    loadQueue[i]()
  }
}

function onWindowLoaded (fn) {
  if (module.exports.loaded) return fn()
  else loadQueue.push(fn)
}

function isEdge () {
  return !!window.navigator.userAgent.match(/Edge\/\d+\.\d+$/)
}
