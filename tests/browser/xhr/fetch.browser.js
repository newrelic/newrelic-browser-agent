/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test')
const ee = require('ee')
var handleEE = ee.get('handle')

require('../../../feature/xhr/instrument')

let proto = location.protocol
let assetServerHTTPPort = NREUM.info.assetServerPort
let assetServerSSLPort = NREUM.info.assetServerSSLPort
let assetServerPort = proto === 'http:' ? assetServerHTTPPort : assetServerSSLPort
let assetServerHostname = window.location.host.split(':')[0]

var testCases = [
  {
    name: 'basic fetch call',
    invoke: function() {
      window.fetch('/json')
    },
    check: function(t, params, metrics, start) {
      t.equals(params.method, 'GET', 'method')
      t.equals(params.status, 200, 'status')
      t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
      t.equals(params.pathname, '/json', 'pathname')
      t.equals(metrics.txSize, 0, 'request size')
      t.equals(metrics.rxSize, 14, 'response size')
      t.ok(metrics.duration > 1, 'duration is a positive number')
      t.ok(start > 0, 'start is a positive number')
    }
  }, {
    name: 'fetch with Request parameter',
    invoke: function() {
      var request = new Request('/json')
      window.fetch(request)
    },
    check: function(t, params, metrics, start) {
      t.equals(params.method, 'GET', 'method')
      t.equals(params.status, 200, 'status')
      t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
      t.equals(params.pathname, '/json', 'pathname')
      t.equals(metrics.txSize, 0, 'request size')
      t.equals(metrics.rxSize, 14, 'response size')
      t.ok(metrics.duration > 1, 'duration is a positive number')
      t.ok(start > 0, 'start is a positive number')
    }
  }, {
    name: 'fetch with URL parameter',
    invoke: function() {
      var request = new URL('http://' + assetServerHostname + ':' + assetServerPort + '/json')
      window.fetch(request)
    },
    check: function(t, params, metrics, start) {
      t.equals(params.method, 'GET', 'method')
      t.equals(params.status, 200, 'status')
      t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
      t.equals(params.pathname, '/json', 'pathname')
      t.equals(metrics.txSize, 0, 'request size')
      t.equals(metrics.rxSize, 14, 'response size')
      t.ok(metrics.duration > 1, 'duration is a positive number')
      t.ok(start > 0, 'start is a positive number')
    }
  },
  {
    name: 'fetch with error response',
    invoke: function() {
      var request = new URL('http://' + assetServerHostname + ':' + assetServerPort + '/paththatdoesnotexist')
      window.fetch(request)
    },
    check: function(t, params, metrics, start) {
      t.equals(params.method, 'GET', 'method')
      t.equals(params.status, 404, 'status')
      t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
      t.equals(params.pathname, '/paththatdoesnotexist', 'pathname')
      t.equals(metrics.txSize, 0, 'request size')
      t.ok(!metrics.rxSize, 'response size is not defined')
      t.ok(metrics.duration > 1, 'duration is a positive number')
      t.ok(start > 0, 'start is a positive number')
    }
  }
]

ee.emit('feat-err', [])
if (!window.NREUM) NREUM = {}
if (!NREUM.loader_config) NREUM.loader_config = {}

testCases.forEach(function(testCase) {
  test(testCase.name, function(t) {
    if (!window.fetch) {
      t.pass('fetch is not supported in this browser')
      t.end()
      return
    }

    handleEE.addEventListener('xhr', validate)
    testCase.invoke()

    function validate(params, metrics, start) {
      testCase.check(t, params, metrics, start)
      t.end()
      handleEE.removeEventListener('xhr', validate)
    }
  })
})

// fetch rejects only if there is a network error; this is possible to simulate by closing
// the connection in the server, but it does not work when there is a proxy in between (like Saucelabs).
// This tests therefore simulates failed fetch call by emitting the instrumentation events instead.
test('rejected fetch call is captured', function(t) {
  if (!window.fetch) {
    t.pass('fetch is not supported in this browser')
    t.end()
    return
  }

  const fetchEE = ee.get('fetch')

  handleEE.addEventListener('xhr', validate)

  const promise = new Promise((resolve, reject) => {})
  fetchEE.emit('fetch-start', [['/someurl'], null], promise)

  // delay end, so that duration is greater than 0
  setTimeout(() => {
    fetchEE.emit('fetch-end', [new Error('some error')], promise)
  }, 1)

  function validate(params, metrics, start) {
    t.equals(params.method, 'GET', 'method')
    t.equals(params.status, 0, 'status')
    t.equals(params.host, assetServerHostname + ':' + assetServerPort, 'host')
    t.equals(params.pathname, '/someurl', 'pathname')
    t.equals(metrics.txSize, 0, 'request size')
    t.ok(metrics.rxSize == null, 'response size is not defined')
    t.ok(metrics.duration > 0, 'duration is a positive number')
    t.ok(start > 0, 'start is a positive number')

    handleEE.removeEventListener('xhr', validate)
    t.end()
  }
})
