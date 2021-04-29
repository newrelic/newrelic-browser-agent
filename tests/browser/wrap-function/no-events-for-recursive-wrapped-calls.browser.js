/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var rootEE = require('ee')
var wrapFn = require('../../../wrap-function')
var test = require('../../../tools/jil/browser-test.js')

var eeId = 0

test('recursive calls to wrapped functions from start/end event callbacks should not trigger more events', function (t) {
  let ee = rootEE.get(eeId++)
  let wrappedFoo = wrapFn(ee)(foo, 'fn-')

  let fooCallCount = 0
  let fnStartCount = 0
  let fnEndCount = 0

  ee.on('fn-start', function () {
    fnStartCount += 1
    wrappedFoo()
  })

  ee.on('fn-end', function () {
    fnEndCount += 1
    wrappedFoo()
  })

  wrappedFoo()

  t.equal(fooCallCount, 3, 'foo should be called thrice')
  t.equal(fnStartCount, 1, 'fn-start event emitted ' + fnStartCount + ' times')
  t.equal(fnEndCount, 1, 'fn-end event emitted ' + fnEndCount + ' times')
  t.end()

  function foo () {
    fooCallCount += 1
  }
})

test('calls to other wrapped functions from start/end event callbacks should not trigger more events', function (t) {
  let ee = rootEE.get(eeId++)
  let wrapper = wrapFn(ee)
  let wrappedFoo = wrapper(foo, 'fn-')
  let wrappedBar = wrapper(bar, 'fn-')

  let fooCallCount = 0
  let barCallCount = 0
  let fnStartCount = 0
  let fnEndCount = 0

  ee.on('fn-start', function () {
    fnStartCount += 1
    wrappedBar()
  })

  ee.on('fn-end', function () {
    fnEndCount += 1
    wrappedBar()
  })

  wrappedFoo()

  t.equal(fooCallCount, 1, 'foo should be called once')
  t.equal(barCallCount, 2, 'bar should be called twice')
  t.equal(fnStartCount, 1, 'fn-start event emitted ' + fnStartCount + ' times')
  t.equal(fnEndCount, 1, 'fn-end event emitted ' + fnEndCount + ' times')
  t.end()

  function foo () {
    fooCallCount += 1
  }

  function bar () {
    barCallCount += 1
  }
})

test('calls to other wrapped functions from start/end event callbacks with different prefix should not trigger more events', function (t) {
  let ee = rootEE.get(eeId++)
  let wrapper = wrapFn(ee)
  let wrappedFoo = wrapper(foo, 'foo-')
  let wrappedBar = wrapper(bar, 'bar-')

  let fooCallCount = 0
  let barCallCount = 0
  let fooStartCount = 0
  let fooEndCount = 0
  let barStartCount = 0
  let barEndCount = 0

  ee.on('foo-start', function () {
    fooStartCount += 1
    wrappedBar()
  })

  ee.on('foo-end', function () {
    fooEndCount += 1
    wrappedBar()
  })

  ee.on('bar-start', () => barStartCount++)
  ee.on('bar-end', () => barEndCount++)

  wrappedFoo()
  wrappedBar()

  t.equal(fooCallCount, 1, 'foo should be called once')
  t.equal(barCallCount, 3, 'bar should be called thrice')
  t.equal(fooStartCount, 1, 'foo-start event emitted ' + fooStartCount + ' times')
  t.equal(fooEndCount, 1, 'foo-end event emitted ' + fooEndCount + ' times')
  t.equal(barStartCount, 1, 'bar-start event emitted ' + barStartCount + ' times')
  t.equal(barEndCount, 1, 'bar-end event emitted ' + barEndCount + ' times')
  t.end()

  function foo () {
    fooCallCount += 1
  }

  function bar () {
    barCallCount += 1
  }
})

test('always flag allows nested calls', function (t) {
  let fooCallCount = 0
  let barCallCount = 0
  let fooStartCount = 0
  let barStartCount = 0

  let ee = rootEE.get(eeId++)
  let alwaysWrappedFoo = wrapFn(ee, true)(foo, 'foo-')
  let wrappedBar = wrapFn(ee)(bar, 'bar-')

  ee.on('foo-start', function () {
    fooStartCount += 1
    wrappedBar()
  })

  ee.on('bar-start', function () {
    barStartCount += 1
    alwaysWrappedFoo()
  })

  wrappedBar()
  alwaysWrappedFoo()

  t.equal(fooCallCount, 2, 'foo should be called twice')
  t.equal(barCallCount, 3, 'bar should be called thrice')
  t.equal(fooStartCount, 2, 'foo-start event emitted ' + fooStartCount + ' times')
  t.equal(barStartCount, 1, 'bar-start event emitted ' + barStartCount + ' times')
  t.end()

  function foo () {
    fooCallCount += 1
  }

  function bar () {
    barCallCount += 1
  }
})
