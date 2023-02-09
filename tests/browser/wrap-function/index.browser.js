/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { setup } from '../utils/setup'
import createWrapperWithEmitter from '../../../src/common/wrap/wrap-function'
import test from '../../../tools/jil/browser-test.js'

const { baseEE } = setup()
const wrapFn = createWrapperWithEmitter(baseEE)

// set a prop to make sure it gets copied (nonenumerable on modern platforms)
args.foobar = 100

var obj = { args: args, takesTime: takesTime, errors: errors }

test('Wrap Function', function (t) {
  var wArgs = wrapFn(args)
  var wErrors = wrapFn(errors, 'errFn-')
  var wTakesTime = wrapFn(takesTime, 'time-', sameCtx)

  t.equal(wArgs.foobar, 100, 'Props coppied from original fn')

  wrapFn.inPlace(obj, ['args', 'takesTime', 'errors'], '-', thisCtx)

  if (Object.defineProperty && Object.keys) {
    wArgs.foobar = 2

    t.equal(obj.args.foobar, 2, 'Proxy accessors work')
  }

  baseEE.on('start', function (args, self, methodName) {
    t.equal(args[1], 2, 'event args make sense')
  })
  baseEE.on('end', function (args, self, result) {
    t.equal(result, 3, 'result of calling function reported')
  })

  baseEE.on('time-start', function (args, self, methodName) {
    this.start = new Date().getTime()
  })

  baseEE.on('time-end', function (args, self, result) {
    t.ok(new Date().getTime() - this.start > 9, 'start and end fired at least as far apart as fn took')
  })

  baseEE.on('errFn-err', function (args, self, err) {
    t.equal(err.message, 'This is an error', 'got thrown error')
  })

  baseEE.on('args-start', function (args, self, methodName) {
    t.equal(methodName, 'args', 'Methondname passed to event handler')
    args[2] = 42
    this.argsStart = true
  })

  baseEE.on('takesTime-start', function (args, self, methodName) {
    t.ok(this.argsStart, 'Context reused among wrapped methods using sameCtx')
  })

  t.ok(wArgs[wrapFn.flag], 'wrapped flag set')
  t.equal(wrapFn(wArgs), wArgs, 're-wrapping just returns same function')
  t.equal(wrapFn('foo'), 'foo', 'Wrapping non functions returns same value')

  var empty = {}
  wrapFn.inPlace(empty, ['foo'])
  if (!('foo' in empty)) t.pass('Empty key not added')

  t.equal(wArgs(1, 2, 3), args(1, 2, 3), 'wrapped returns same argument')

  t.equal(obj.args(1, 2, 3), 42, 'obj wrapped returns modified argument')

  t.equal(takesTime(), wTakesTime(), 'Wrapped has same "this"')
  t.equal(obj.takesTime(), obj, 'obj wrapped has same "this"')

  try {
    wErrors()
  } catch (err) {
    t.ok(err, 'Wrapped still throws')
  }

  // Make sure default context isn't reused before a call is finished.
  baseEE.on('out-start', function (args) {
    t.notok(this.ok, 'Ctx not reused for ' + (args[0] ? 'inner' : 'outer'))
    this.ok = true
  })
  baseEE.on('out-end', function (args) {
    t.ok(this.ok, 'context not messed up for ' + (args[0] ? 'inner' : 'outer'))
  })

  var inner = wrapFn(function (sent) {
    if (!sent) inner(true)
  }, 'out-')

  inner(false)

  // Raise errors in our instrumentation and ensure they're caught

  wrapFn(args, 'getContextError', makeError('getContext'))()

  baseEE.on('prefix-start', makeError('baseEE.emit start'))
  baseEE.on('prefix-end', makeError('baseEE.emit end'))
  wrapFn(args, 'prefix-')()

  baseEE.on('prefixError-err', makeError('baseEE.emit err'))
  try {
    wrapFn(errors, 'prefixError-')()
  } catch (e) {
    if (e.message !== 'This is an error') throw e
  }

  t.end()
})

function args (a, b, c) {
  return c
}

function takesTime () {
  var start = new Date().getTime()
  while (new Date().getTime() < start + 10) {
    // hack to prevent the loop below from being optimized out on safari 8
    try {
      throw new Error()
    } catch (e) {
      // if (this) this.counter++
    }
  }

  return this || window
}

function errors () {
  throw new Error('This is an error')
}

function makeError (msg) {
  return function () {
    throw new Error(msg)
  }
}

function thisCtx (args, obj) {
  return obj
}

var ctx = {}
function sameCtx () {
  return ctx
}
