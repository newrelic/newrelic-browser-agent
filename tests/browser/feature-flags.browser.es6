/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var ee = require('ee')
var activateFeatures = require('../../agent/feature-flags')

test('activate features ', function (t) {
  var featFooCallbacks = 0
  var featBarCallbacks = 0
  ee.on('feat-foo', function () { featFooCallbacks += 1 })
  ee.on('feat-bar', function () { featBarCallbacks += 1 })

  t.plan(2)
  activateFeatures(null)             // should trigger nothing
  activateFeatures({foo: 0, bar: 1}) // should only trigger feat-bar
  activateFeatures({foo: 0, bar: 1}) // should not trigger another feat-bar

  t.equal(featFooCallbacks, 0, 'foo should never be activated')
  t.equal(featBarCallbacks, 1, 'bar should only be activated once')
})
