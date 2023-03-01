/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const { ee } = require('../../src/common/event-emitter/contextual-ee')
var test = require('../../tools/jil/browser-test.js')

test('Contextual EE', function (t) {
  ee.on('args-test', function (a, b, c) {
    t.equal(a, 'a', 'First arg')
    t.equal(b, 'b', 'Second arg')
    t.equal(c, 'c', 'Third arg')
  })
  ee.on('context-test-a', function () {
    this.foo = 'foo'
  })
  ee.on('context-test-b', function () {
    t.equal(this.foo, 'foo', 'Prop saved to context')
  })

  ee.on('multiple-handlers', function () {
    this.count = 1
  })
  ee.on('multiple-handlers', function () {
    this.count += 1
  })
  ee.on('multiple-handlers', function () {
    t.equal(this.count, 2, 'Multiple handlers fired, in correct order')
  })

  ee.emit('args-test', ['a', 'b', 'c'])

  var fooObj = {}
  var aContext = ee.emit('context-test-a', [], fooObj)
  var bContext = ee.emit('context-test-b', [], fooObj)

  t.equal(aContext.foo, 'foo', 'Context object returned')
  t.equal(aContext, bContext, 'Reused objects have the same context')
  t.equal(fooObj['nr@context'], aContext, 'Context saved with expected key')

  ee.emit('multiple-handlers', [], {})

  t.end()
})

test('ee.abort condition met', function (t) {
  ee.aborted = false
  ee.backlog.api = ['foo', 'bar', 'baz']
  ee.backlog.feature = null
  ee.abort()

  t.equal(ee.aborted, true)

  t.end()
})

test('EE clears eventBuffer (ee.backlog) after abort', function (t) {
  ee.aborted = false
  if (ee.backlog) {
    delete ee.backlog.feature
  }

  ee.buffer(['eventType'], 'feature')

  t.equal(ee.backlog.feature instanceof Array, true, 'feature backlog is an array')
  t.equal(ee.backlog.feature.length, 0, 'feature backlog is an empty array')

  ee.emit('eventType', [], {})

  t.equal(ee.backlog.feature.length, 1, 'emitted event was buffered')

  ee.abort()

  t.equal(Object.keys(ee.backlog).length, 0, 'EE backlog was cleared after abort')

  t.end()
})

test('Forced EE does not buffer events after it has been aborted', function (t) {
  ee.aborted = false
  if (ee.backlog) {
    delete ee.backlog.feature
  }

  ee.buffer(['eventType'], 'feature')
  ee.abort()

  ee.buffer(['eventType'], 'feature')
  ee.emit('eventType', [], {}, true)

  t.equal(Object.keys(ee.backlog).length, 0, 'emitted event was not buffered after ee.abort')

  t.end()
})
