/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var through = require('through')
var tape = require('tape')

window.$ = require('jquery')

var out = through(
  function (data) {
    window.$('#tap').append(data)
    if (test._exitCode) window._jilUnitDone = true
  },
  function () {
    window._jilUnitDone = true
  }
)

var test = tape.createHarness()
test.createStream().pipe(out)

module.exports = runTest

function runTest (name, supported, fn) {
  var args
  if (typeof supported === 'function') {
    fn = supported
    args = [name, wrappedTest]
  } else {
    args = [name, supported, wrappedTest]
  }

  test.apply(this, args)

  function wrappedTest (t) {
    try {
      fn.apply(this, arguments)
    } catch (err) {
      t.fail(err)
    }
  }
}
runTest.log = log

function log () {
  for (var i = 0; i < arguments.length; i++) {
    out.write(arguments[i] + '\n')
  }
}
