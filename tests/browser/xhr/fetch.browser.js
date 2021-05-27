/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test')
const register = require('../../../agent/register-handler')
const drain = require('../../../agent/drain')
const ee = require('ee')
const ffVersion = require('../../../loader/firefox-version')
const jil = require('jil')

require('../../../feature/xhr/instrument')
require('../../../feature/err/instrument')
require('../../../feature/err/aggregate')

let proto = location.protocol
let assetServerHTTPPort = NREUM.info.assetServerPort
let assetServerSSLPort = NREUM.info.assetServerSSLPort
let assetServerPort = proto === 'http:' ? assetServerHTTPPort : assetServerSSLPort
let corsServerPort = NREUM.info.corsServerPort
let assetServerHostname = window.location.host.split(':')[0]

test('basic fetch call', function(t) {
  ee.emit('feat-err', [])

  if (!window.NREUM) NREUM = {}
  if (!NREUM.loader_config) NREUM.loader_config = {}

  fetch('/json')

  register('xhr', function(params, metrics, start) {
    require('../../../feature/xhr/aggregate')(params, metrics, start)

    t.equals(params.method, 'GET', 'method')
    t.equals(params.status, 200, 'status')
    t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
    t.equals(params.pathname, '/json', 'pathname')

    t.equals(metrics.txSize, 0, 'request size')
    t.equals(metrics.rxSize, 14, 'response size')
    t.ok(metrics.duration > 1, 'duration is a positive number')

    t.ok(start > 0, 'start is a positive number')

    t.end()
  })

  drain('feature')
})
