/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const { drain, registerDrain } = require('../../src/common/drain/drain')
var { registerHandler: register } = require('../../src/common/event-emitter/register-handler.js')

const { setup } = require('./utils/setup')
const { baseEE, agentIdentifier } = setup()

jil.browserTest('drain', function (t) {
  let eventId = 0
  let bufferId = 0

  t.test('unbuffered handlers', function (t) {
    let ee = baseEE.get('unbuffered')
    let eventName = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++
    let ctx = ee.context()
    let args = [1, 2, 3]
    let step = 0

    t.plan(11)

    ee.buffer([eventName], bufferName)

    baseEE.on(eventName, function () {
      t.equal(step++, 0, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    ee.on(eventName, function () {
      t.equal(step++, 1, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    ee.emit(eventName, args, ctx)

    register(
      eventName,
      function () {
        t.fail('should not be called')
      },
      bufferName,
      baseEE
    )

    register(
      eventName,
      function () {
        t.equal(step++, 3, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      ee
    )

    register(
      eventName,
      function () {
        t.fail('should not be called')
      },
      'otherGroup',
      ee
    )

    t.equal(step++, 2, 'should be in right order')

    drain(agentIdentifier, bufferName)

    t.equal(step++, 4, 'should be in right order')
    t.end()
  })

  t.test('unbuffered handlers, early register', function (t) {
    let ee = baseEE.get('early register')
    let eventName = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++
    let ctx = ee.context()
    let args = [1, 2, 3]
    let step = 0

    t.plan(11)

    ee.buffer([eventName], bufferName)

    baseEE.on(eventName, function () {
      t.equal(step++, 0, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    ee.on(eventName, function () {
      t.equal(step++, 1, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    register(
      eventName,
      function () {
        t.fail('should not be called')
      },
      bufferName,
      baseEE
    )

    register(
      eventName,
      function () {
        t.equal(step++, 3, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      ee
    )

    register(
      eventName,
      function () {
        t.fail('should not be called')
      },
      'otherGroup',
      ee
    )

    ee.emit(eventName, args, ctx)
    t.equal(step++, 2, 'should be in right order')

    drain(agentIdentifier, bufferName)
    t.equal(step++, 4, 'should be in right order')
    t.end()
  })

  t.test('unbuffered handlers, emit after drain', function (t) {
    let ee = baseEE.get('after drain')
    let eventName = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++
    let ctx = ee.context()
    let args = [1, 2, 3]
    let step = 0

    t.plan(13)

    ee.buffer([eventName], bufferName)

    baseEE.on(eventName, function () {
      t.equal(step++, 0, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    ee.on(eventName, function () {
      t.equal(step++, 2, 'should be in right order')
      t.equal(this, ctx, 'should have right context')
      t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
    })

    register(
      eventName,
      function () {
        t.equal(step++, 1, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      baseEE
    )

    register(
      eventName,
      function () {
        t.equal(step++, 3, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      ee
    )

    register(
      eventName,
      function () {
        t.fail('should not be called')
      },
      'otherGroup',
      ee
    )

    drain(agentIdentifier, bufferName)
    ee.emit(eventName, args, ctx)
    t.equal(step++, 4, 'should be in right order')

    t.end()
  })

  t.test('emit buffered event in buffered handler', function (t) {
    let ee = baseEE.get('emit while draining')
    let eventName = 'event_' + eventId++
    let otherEvent = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++
    let ctx = ee.context()
    let args = [1, 2, 3]
    let step = 0
    let otherCount = 0

    t.plan(11)

    ee.buffer([eventName], bufferName)
    ee.buffer([otherEvent], bufferName)

    register(
      eventName,
      function () {
        t.equal(step++, 1, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
        ee.emit(otherEvent, [123], ctx)
      },
      bufferName,
      ee
    )

    register(
      otherEvent,
      function () {
        switch (otherCount++) {
          case 0:
            t.equal(step++, 2, 'should be in right order')
            t.equal(this, ctx, 'should have right context')
            t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
            break
          case 1:
            t.equal(step++, 3, 'should be in right order')
            t.equal(this, ctx, 'should have right context')
            t.deepEqual(Array.prototype.slice.call(arguments), [123], 'should have right args')
            break
          default:
            t.fail('should only be called twice')
        }
      },
      bufferName,
      ee
    )

    ee.emit(eventName, args, ctx)
    ee.emit(otherEvent, args, ctx)

    t.equal(step++, 0, 'should be in right order')
    drain(agentIdentifier, bufferName)
    t.equal(step++, 4, 'should be in right order')
    t.end()
  })

  t.test('emit buffered event in unbuffered handler', function (t) {
    let ee = baseEE.get('emit buffered event in unbuffered handler')
    let eventName = 'event_' + eventId++
    let otherEvent = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++
    let ctx = ee.context()
    let args = [1, 2, 3]
    let step = 0

    t.plan(8)

    ee.buffer([eventName, otherEvent], bufferName)

    register(
      eventName,
      function () {
        t.equal(step++, 2, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      ee
    )

    register(
      otherEvent,
      function () {
        t.equal(step++, 1, 'should be in right order')
        t.equal(this, ctx, 'should have right context')
        t.deepEqual(Array.prototype.slice.call(arguments), args, 'should have right args')
      },
      bufferName,
      ee
    )

    ee.on(eventName, function () {
      ee.emit(otherEvent, args, ctx)
    })

    ee.emit(eventName, args, ctx)

    t.equal(step++, 0, 'should be in right order')
    drain(agentIdentifier, bufferName)
    t.equal(step++, 3, 'should be in right order')
    t.end()
  })

  t.test('does not resume buffering after drain', function (t) {
    let ee = baseEE.get('no buffer after drain')
    let eventName = 'event_' + eventId++
    let bufferName = 'buffer_' + bufferId++

    t.plan(2)

    ee.buffer([eventName], bufferName)
    ee.emit(eventName)
    t.equal(baseEE.backlog[bufferName].length, 1, 'should buffer events before drain')
    drain(agentIdentifier, bufferName)
    ee.buffer([eventName], bufferName)
    ee.emit(eventName)
    t.equal(baseEE.backlog[bufferName], null, 'should not buffer after drain')
    t.end()
  })
})
