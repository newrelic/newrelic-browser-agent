/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { sHash } from '../util/s-hash'
import { navCookie } from '../timing/start-time'
import { getConfigurationValue } from '../config/config'

export function conditionallySet(agentIdentifier) {
  var areCookiesEnabled = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled')

  if (navCookie && areCookiesEnabled) {
    exports.setCookie(); // allow importing modules (e.g., browser tests) to change setCookie() below
  }
}

export function setCookie() {
  document.cookie = 'NREUM=s=' + Number(new Date()) + '&r=' + sHash(document.location.href) + '&p=' + sHash(document.referrer) + '; path=/'
}
