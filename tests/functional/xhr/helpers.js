/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const Matcher = require('../../../tools/jil/util/browser-matcher')

const sendBeaconBrowsers = Matcher.withFeature('workingSendBeacon')

function getXhrFromResponse(response, browser) {
  if (sendBeaconBrowsers.match(browser)) {
    return JSON.parse(response.body).xhr
  } else {
    return JSON.parse(response.query.xhr)
  }
}

module.exports = { getXhrFromResponse }
