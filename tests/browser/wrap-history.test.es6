/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'

jil.browserTest('history functions are wrapped', function (t) {
  // wrap
  require('../../feature/wrap-history.js')

  if (window.history && window.history.pushState) {
    t.ok(isWrapped(window.history.pushState), 'pushState is wrapped')
    t.ok(isWrapped(window.history.replaceState), 'replaceState is wrapped')
  } else {
    t.pass('no history functions')
  }

  t.end()
})

jil.browserTest('a new property is not shown in the history object', function (t) {
  // wrap
  require('../../feature/wrap-history.js')

  var proto = window.history.constructor && window.history.constructor.prototype
  if (proto.pushState) {
    t.equal(window.history.hasOwnProperty('pushState'), false)
    t.equal(window.history.hasOwnProperty('replaceState'), false)
  } else {
    t.pass('not on constructor')
  }

  t.end()
})

function isWrapped(fn) {
  return fn && (typeof fn['nr@original'] === 'function')
}
