/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const {setup} = require('./utils/setup')
const {wrapEvents} = require('@newrelic/browser-agent-core/src/common/wrap/wrap-events')
const {baseEE} = setup()

jil.browserTest('AEL on window should call through to AEL on EventTarget', function (t) {
  t.plan(3)
  var target = window

  while (!target.hasOwnProperty('addEventListener')) {
    target = Object.getPrototypeOf(target)
  }

  wrapEvents(baseEE)

  let addE = target.addEventListener
  target.addEventListener = function (evName, handler, capture) {
    t.equal(evName, 'click', 'evName should be correct')
    t.equal(handler, clickHandler, 'handler should be correct')
    t.equal(capture, true, 'capture should be correct')
    target.addEventListener = addE
  }

  window.addEventListener('click', clickHandler, true)
  t.end()

  function clickHandler () {}
})
