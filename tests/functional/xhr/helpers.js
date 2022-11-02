/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const Matcher = require('../../../tools/jil/util/browser-matcher')
const querypack = require('@newrelic/nr-querypack')

const sendBeaconBrowsers = Matcher.withFeature('workingSendBeacon')

const condition = (e) => e.type === 'ajax' && e.path === '/json'

function getXhrFromResponse(response, browser) {
  if (sendBeaconBrowsers.match(browser)) {
    return JSON.parse(response.body).xhr
  } else {
    return JSON.parse(response.query.xhr)
  }
}

function fail(t, addlMsg = undefined) {
	return (err) => {
    t.error(err, addlMsg);
    t.end();
	}
}

module.exports = { getXhrFromResponse, fail, condition, querypack }
