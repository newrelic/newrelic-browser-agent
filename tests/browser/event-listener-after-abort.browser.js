/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('eventListener methods work as expected after abort', function (t) {
  const { setup } = require('./utils/setup')
  const { wrapEvents } = require('../../src/common/wrap/wrap-events.js')

  const { baseEE } = setup()
  wrapEvents(baseEE)
  const ee = baseEE

  let handler1CallCount = 0
  let handler2CallCount = 0
  let el = createAndAddDomElement()

  el.addEventListener('click', handler1)
  el.addEventListener('click', handler2)
  triggerEvent(el, 'click')

  ee.aborted = true

  triggerEvent(el, 'click')
  t.equal(handler1CallCount, 2, 'should have seen handler1 called twice')
  t.equal(handler2CallCount, 2, 'should have seen handler2 called twice')

  el.removeEventListener('click', handler2)
  triggerEvent(el, 'click')

  t.equal(handler1CallCount, 3, 'should have seen handler1 called 3 times')
  t.equal(handler2CallCount, 2, 'should have seen handler2 called twice')

  el.addEventListener('click', handler1)
  el.addEventListener('click', handler2)
  triggerEvent(el, 'click')

  t.equal(handler1CallCount, 4, 'should have seen handler1 called 4 times')
  t.equal(handler2CallCount, 3, 'should have seen handler2 called 3 times')

  el.removeEventListener('click', handler1)
  el.removeEventListener('click', handler2)
  triggerEvent(el, 'click')

  t.equal(handler1CallCount, 4, 'should have seen handler1 called 4 times')
  t.equal(handler2CallCount, 3, 'should have seen handler2 called 3 times')

  t.end()

  function handler1 () {
    handler1CallCount++
  }
  function handler2 () {
    handler2CallCount++
  }
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
