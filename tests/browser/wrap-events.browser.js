/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const {setup} = require('./utils/setup')
const {wrapEvents} = require('@newrelic/browser-agent-core/src/common/wrap/wrap-events')
const {baseEE} = setup()

function removeListener (type, fn) {
  const handlers = this.listeners(type)
  var index = handlers.indexOf(fn)
  handlers.splice(index, 1)
}

jil.browserTest('addEventListener should target only the given event', function (t) {
  var ee = baseEE
  ee.removeListener = removeListener
  wrapEvents(baseEE)

  var listenerCount = 0
  var listener = function () {
    listenerCount++
  }
  ee.on('fn-start', listener)

  let e = createAndAddDomElement()
  let handlerCallCount = 0

  e.addEventListener('click', () => handlerCallCount++, false)

  triggerEvent(e, 'click')
  triggerEvent(e, 'mouseup')

  t.equal(1, handlerCallCount, 'expected only one handler call for click event')
  t.equal(listenerCount, 1, 'should have called the listener once')

  ee.removeListener('fn-start', listener)
  t.end()
})

jil.browserTest('addEventListener should not blow up with a null func', function (t) {
  wrapEvents(baseEE)

  let e = createAndAddDomElement()

  try {
    e.addEventListener('click', null, false)
    t.pass('Called successfully')
  } catch (e) {
    t.fail('Caught exception')
  }
  t.end()
})

jil.browserTest('addEventListener allows multiple subscribers to same event on same element', function (t) {
  wrapEvents(baseEE)

  let handler1CallCount = 0
  let handler2CallCount = 0
  let e = createAndAddDomElement()

  e.addEventListener('click', () => handler1CallCount++, false)
  e.addEventListener('click', () => handler2CallCount++, false)

  triggerEvent(e, 'click')
  triggerEvent(e, 'click')

  t.equal(handler1CallCount, 2, 'expected two calls to handler 1')
  t.equal(handler2CallCount, 2, 'expected two calls to handler 2')
  t.end()
})

jil.browserTest('addEventListener allows object with handleEvent property', function (t) {
  var ee = baseEE
  ee.removeListener = removeListener
  wrapEvents(baseEE)

  let Clicker = function (el) {
    this.handlerCallCount = 0
    this.handleEvent = function (event) {
      this.handlerCallCount++
    }
  }

  var listenerCount = 0
  var listener = function () {
    listenerCount++
  }
  ee.on('fn-start', listener)

  let e = createAndAddDomElement()
  let clicker = new Clicker(e)
  e.addEventListener('click', clicker, false)

  triggerEvent(e, 'click')
  t.equal(clicker.handlerCallCount, 1, 'should have one call to handler')
  t.equal(listenerCount, 1, 'should have listener counter of 1')

  e.removeEventListener('click', clicker, false)
  triggerEvent(e, 'click')
  t.equal(clicker.handlerCallCount, 1, 'removing handler should work')
  t.equal(listenerCount, 1, 'should not have been called again')

  ee.removeListener('fn-start', listener)
  t.end()
})

jil.browserTest('addEventListener allows for multiple event listeners with an object', function (t) {
  var ee = baseEE
  ee.removeListener = removeListener
  wrapEvents(baseEE)

  let Clicker = function () {
    this.counter = 0
    this.handleEvent = function (event) {
      this.counter++
    }
  }

  var callCount = 0
  var listener = function () {
    callCount++
  }
  ee.on('fn-start', listener)

  let e = createAndAddDomElement()
  let clicker = new Clicker()
  e.addEventListener('click', clicker, false)
  e.addEventListener('keyup', clicker, false)

  triggerEvent(e, 'click')
  triggerEvent(e, 'keyup')
  t.equal(callCount, 2, 'should have two calls')
  t.equal(clicker.counter, 2, 'should have two calls')

  e.removeEventListener('click', clicker, false)

  triggerEvent(e, 'click')
  triggerEvent(e, 'keyup')
  t.equal(callCount, 3, 'should have three calls')
  t.equal(clicker.counter, 3, 'should have three calls')

  e.removeEventListener('keyup', clicker, false)

  triggerEvent(e, 'click')
  triggerEvent(e, 'keyup')
  t.equal(callCount, 3, 'should have two calls')
  t.equal(clicker.counter, 3, 'should have three calls')

  t.end()
})

jil.browserTest('addEventListener allows object with handleEvent property that is mutated', function (t) {
  var ee = baseEE
  ee.removeListener = removeListener
  wrapEvents(baseEE)

  let Clicker = function (el) {
    this.counter = 0
    this.handleEvent = function (event) {
      this.counter++
    }
  }

  var listenerCount = 0
  var listener = function () {
    listenerCount++
  }
  ee.on('fn-start', listener)

  let e = createAndAddDomElement()
  let clicker = new Clicker(e)
  e.addEventListener('click', clicker, false)

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 1, 'should have counter of 1')
  t.equal(listenerCount, 1, 'should have listener counter of 1')

  clicker.handleEvent = function (event) {
    this.counter += 2
  }

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 3, 'should have counter of 3')
  t.equal(listenerCount, 2, 'should have listener counter of 2')

  ee.removeListener('fn-start', listener)
  t.end()
})

jil.browserTest('addEventListener allows object with handleEvent property that is originally null', function (t) {
  wrapEvents(baseEE)

  let Clicker = function (el) {
    this.counter = 0
  }

  let e = createAndAddDomElement()
  let clicker = new Clicker(e)
  e.addEventListener('click', clicker, false)

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 0, 'should have counter of zero')

  clicker.handleEvent = function (event) {
    this.counter += 2
  }

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 2, 'should have counter of two')

  t.end()
})

jil.browserTest('removeEventListener works with handleEvent property', function (t) {
  wrapEvents(baseEE)

  let Clicker = function (el) {
    this.counter = 0
  }

  let e = createAndAddDomElement()
  let clicker = new Clicker(e)
  e.addEventListener('click', clicker, false)

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 0, 'should have counter of zero')

  clicker.handleEvent = function (event) {
    this.counter += 2
  }

  triggerEvent(e, 'click')
  t.equal(clicker.counter, 2, 'should have counter of two')
  e.removeEventListener('click', clicker, false)
  triggerEvent(e, 'click')
  t.equal(clicker.counter, 2, 'should still have counter of two')

  t.end()
})

jil.browserTest('removeEventListener works when same callback is passed for different events', function (t) {
  wrapEvents(baseEE)

  let handlerCallCount = 0
  let e = createAndAddDomElement()

  e.addEventListener('click', handler, false)
  e.addEventListener('mouseup', handler, false)
  triggerEvent(e, 'click')
  triggerEvent(e, 'mouseup')

  t.equal(handlerCallCount, 2, 'should have seen handler calls for both events')

  e.removeEventListener('click', handler, false)
  triggerEvent(e, 'click')
  triggerEvent(e, 'mouseup')

  t.equal(handlerCallCount, 3, 'should have seen handler call for mouseup only')

  e.removeEventListener('mouseup', handler, false)
  triggerEvent(e, 'click')
  triggerEvent(e, 'mouseup')

  t.equal(handlerCallCount, 3, 'should have seen handler calls for neither event')

  t.end()

  function handler () { handlerCallCount++ }
})

jil.browserTest('removeEventListener works when same callback is passed for different elements', function (t) {
  wrapEvents(baseEE)

  let handlerCallCount = 0
  let e1 = createAndAddDomElement()
  let e2 = createAndAddDomElement()

  e1.addEventListener('click', handler, false)
  e2.addEventListener('click', handler, false)
  triggerEvent(e1, 'click')
  triggerEvent(e2, 'click')

  t.equal(handlerCallCount, 2, 'should have seen handler calls for both elements')

  e1.removeEventListener('click', handler, false)
  triggerEvent(e1, 'click')
  triggerEvent(e2, 'click')

  t.equal(handlerCallCount, 3, 'should have seen handler call for e2 only')

  e2.removeEventListener('click', handler, false)
  triggerEvent(e1, 'click')
  triggerEvent(e2, 'click')

  t.equal(handlerCallCount, 3, 'should have seen handler calls for neither element')

  t.end()

  function handler () { handlerCallCount++ }
})

function triggerEvent (el, eventName) {
  let evt = document.createEvent('Events')
  evt.initEvent(eventName, true, false)
  el.dispatchEvent(evt)
}

function createAndAddDomElement (tagName = 'div') {
  var el = document.createElement(tagName)
  document.body.appendChild(el)
  return el
}
