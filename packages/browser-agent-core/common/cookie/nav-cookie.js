/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sHash } from '../util/s-hash'
import { navCookie } from '../timing/start-time'
import { getConfigurationValue } from '../config/config'

// var sHash = require('./s-hash')
// var startTime = require('./start-time')

// functions are on object, so that they can be mocked
// var exp = {
//   conditionallySet: conditionallySet,
//   setCookie: setCookie
// }

// module.exports = exp

export function conditionallySet(agentIdentifier) {
  // var areCookiesEnabled = true
  var areCookiesEnabled = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled')
  // if ('init' in NREUM && 'privacy' in NREUM.init) {
  //   areCookiesEnabled = NREUM.init.privacy.cookies_enabled
  // }

  if (navCookie && areCookiesEnabled) {
    setCookie()
  }
}

export function setCookie() {
  document.cookie = 'NREUM=s=' + Number(new Date()) + '&r=' + sHash(document.location.href) + '&p=' + sHash(document.referrer) + '; path=/'
}
