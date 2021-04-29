/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var navCookie = require('../../agent/nav-cookie')
var startTime = require('../../agent/start-time')

test('nav cookie is set by default', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  startTime.navCookie = true
  navCookie.conditionallySet()

  t.equals(called, true, 'NREUM cookie was set')
  t.end()
})

test('nav cookie is set if user tracking is enabled', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  window.NREUM = {
    init: {
      privacy: {
        cookies_enabled: true
      }
    }
  }

  startTime.navCookie = true
  navCookie.conditionallySet()

  t.equals(called, true, 'NREUM cookie was set')
  t.end()
})

test('nav cookie is not set if user tracking is disabled', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  window.NREUM = {
    init: {
      privacy: {
        cookies_enabled: false
      }
    }
  }

  startTime.navCookie = true
  navCookie.conditionallySet()

  t.equals(called, false, 'NREUM cookie was not set')
  t.end()
})

test('nav cookie is not set if performance API is available ', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  startTime.navCookie = false
  navCookie.conditionallySet()

  t.equals(called, false, 'NREUM cookie was not set')
  t.end()
})
