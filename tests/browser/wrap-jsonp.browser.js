/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

function removeListener (type, fn) {
  const handlers = this.listeners(type)
  var index = handlers.indexOf(fn)
  handlers.splice(index, 1)
}

var validUrls = [
  '/path?cb=foo',
  '/path?cb=foo#abc',
  '/path?callback=foo',
  '/path?callback=foo#abc'
]

var invalidUrls = [
  '/path?mycb=foo',
  '/path?ab=1&mycb=foo',
  '/path?mycallback=foo',
  '/path?ab=1&mycallback=foo'
]

validUrls.forEach((url) => {
  shouldWork(url)
})

invalidUrls.forEach((url) => {
  shouldNotWork(url)
})

function shouldWork (url) {
  jil.browserTest('jsonp works with ' + url, function (t) {
    t.plan(1)

    var ee = require('ee').get('jsonp')
    ee.removeListener = removeListener

    require('../../feature/wrap-jsonp.js')

    var listener = function () {
      t.comment('listener called')
      ee.removeListener('new-jsonp', listener)
      t.ok(true, 'should get here')
      t.end()
    }
    ee.on('new-jsonp', listener)

    var document = window.document
    window.foo = function () {}
    var el = document.createElement('script')
    el.src = url
    window.document.body.appendChild(el)
  })
}

function shouldNotWork (url) {
  jil.browserTest('jsonp does not work with ' + url, function (t) {
    t.plan(1)

    var ee = require('ee').get('jsonp')
    ee.removeListener = removeListener

    require('../../feature/wrap-jsonp.js')

    var listener = function () {
      t.fail('should not have been called')
      t.end()
    }

    ee.on('new-jsonp', listener)

    var document = window.document
    window.foo = function () {}
    var el = document.createElement('script')
    el.src = url
    window.document.body.appendChild(el)

    ee.removeListener('new-jsonp', listener)
    t.ok(true)
    t.end()
  })
}
