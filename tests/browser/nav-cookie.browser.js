/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { setup } from './utils/setup'
import { setConfiguration } from '../../src/common/config/config'
import * as navCookie from '../../src/common/cookie/nav-cookie'
import * as startTime from '../../src/common/timing/start-time'

const { agentIdentifier } = setup();
startTime.findStartTime(agentIdentifier);

test('nav cookie is set by default', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  startTime.navCookie = true
  navCookie.conditionallySet(agentIdentifier)

  t.equals(called, true, 'NREUM cookie was set')
  t.end()
})

test('nav cookie is set if user tracking is enabled', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  setConfiguration(agentIdentifier, {
    privacy: {
      cookies_enabled: true
    }
  });

  startTime.navCookie = true
  navCookie.conditionallySet(agentIdentifier)

  t.equals(called, true, 'NREUM cookie was set')
  t.end()
})

test('nav cookie is not set if user tracking is disabled', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  setConfiguration(agentIdentifier, {
    privacy: {
      cookies_enabled: false
    }
  });

  startTime.navCookie = true
  navCookie.conditionallySet(agentIdentifier)

  t.equals(called, false, 'NREUM cookie was not set')
  t.end()
})

test('nav cookie is not set if performance API is available ', function (t) {
  var called = false
  navCookie.setCookie = function() {
    called = true
  }

  startTime.navCookie = false
  navCookie.conditionallySet(agentIdentifier)

  t.equals(called, false, 'NREUM cookie was not set')
  t.end()
})
