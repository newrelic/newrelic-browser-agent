/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var sHash = require('./s-hash')
var startTime = require('./start-time')

// functions are on object, so that they can be mocked
var exp = {
  conditionallySet: conditionallySet,
  setCookie: setCookie
}

module.exports = exp

function conditionallySet() {
  var areCookiesEnabled = true
  if ('init' in NREUM && 'privacy' in NREUM.init) {
    areCookiesEnabled = NREUM.init.privacy.cookies_enabled
  }

  if (startTime.navCookie && areCookiesEnabled) {
    exp.setCookie()
  }
}

function setCookie() {
  document.cookie = 'NREUM=s=' + Number(new Date()) + '&r=' + sHash(document.location.href) + '&p=' + sHash(document.referrer) + '; path=/'
}
