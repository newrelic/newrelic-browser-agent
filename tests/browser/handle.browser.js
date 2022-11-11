/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../tools/jil/browser-test.js')
const {handle, handleEE} = require('../../dist/packages/browser-agent-core/src/common/event-emitter/handle')
const {registerHandler} = require('../../dist/packages/browser-agent-core/src/common/event-emitter/register-handler')
const {drain} = require('../../dist/packages/browser-agent-core/src/common/drain/drain')

test('Handler', function (t) {
  var count = 0
  var ctx = handleEE.context()

  t.plan(18)
  handle('asdf', [{a: 0}], ctx)
  handle('asdf', [{a: 1}], ctx)
  handle('asdf', [{a: 2}], ctx)
  handle('asdf', [{a: 3}], ctx)
  registerHandler('asdf', function (asdf) {
    t.equal(this, ctx, 'should have right context')
    t.equal(asdf.a, count, count + ' event triggered in order')
    count += 1
  })
  handle('asdf', [{a: 4}], ctx)
  handle('asdf', [{a: 5}], ctx)

  handle('many', [1, 2, 3, 4, 5], ctx)
  registerHandler('many', function () {
    t.equal(this, ctx, 'should have right context')
    var sum = 0
    for (var i = 0; i < arguments.length; i++) {
      sum += arguments[i]
    }
    t.equal(sum, 15, count + ' All arguments used')
    count += 1
  })
  handle('many', [5, 4, 3, 3], ctx)
  drain(null, 'feature')
  registerHandler('noq', function (foo) {
    t.equal(this, ctx, 'should have right context')
    t.equal(foo, 'bar', count + ' handler added before any events')
    count += 1
  }, 'other')

  handle('noq', ['bar'], ctx, 'other')
  setTimeout(function () {
    handle('noq', ['bar'], ctx)
    drain(null, 'other')
    t.end()
  }, 0)
})
