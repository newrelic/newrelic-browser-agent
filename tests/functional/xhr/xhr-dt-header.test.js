/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

var supported = testDriver.Matcher.withFeature('cors')
  .exclude('ie@<=9') // IE 9 and below do not support btoa()

testDriver.test('DT headers are NOT added when the feature is not enabled (default)', supported, function (t, browser, router) {
  t.plan(3)
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }

  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-sameorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config }, true))
  const ajaxPromise = router.expect('assetServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.notOk(headers['newrelic'], 'newrelic header should not be present')
      t.notOk(headers['traceparent'], 'traceparent header should not be present')
      t.notOk(headers['tracestate'], 'tracestate header should not be present')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('XHR request on same origin has DT headers', supported, function (t, browser, router) {
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }
  let init = {
    distributed_tracing: {
      enabled: true
    },
    metrics: {
      enabled: true
    }
  }

  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-sameorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }, true))
  const ajaxPromise = router.expect('assetServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.ok(headers['newrelic'], 'newrelic header should be present')

      // newrelic header
      let buffer = Buffer.from(headers['newrelic'], 'base64')
      let text = buffer.toString('ascii')
      let dtPayload = JSON.parse(text)

      t.deepEqual(dtPayload.v, [0, 1])
      t.equal(dtPayload.d.ty, 'Browser')
      t.equal(dtPayload.d.ac, config.accountID)
      t.equal(dtPayload.d.ap, config.agentID)
      t.equal(dtPayload.d.tk, config.trustKey)
      t.ok(dtPayload.d.id)
      t.ok(dtPayload.d.tr)
      t.ok(dtPayload.d.ti)

      // TraceContext headers
      const parentHeader = headers['traceparent']
      var parts = parentHeader.split('-')
      t.equal(parts.length, 4, 'parent header should have four parts')
      t.equal(parts[0], '00', 'first part should be format version set to 00')
      t.ok(parts[1], 'trace ID is there')
      t.ok(parts[2], 'span ID is there')
      t.equal(parts[3], '01', 'fourth part should be set to sampled flag')

      const stateHeader = headers['tracestate']
      var key = stateHeader.substring(0, stateHeader.indexOf('='))
      t.equal(key, config.trustKey + '@nr', 'key should be in the right format')

      parts = stateHeader.substring(stateHeader.indexOf('=') + 1).split('-')
      t.equal(parts.length, 9, 'state header should have nine parts')
      t.equal(parts[0], '0', 'version is set to 0')
      t.equal(parts[1], '1', 'parent type is set to 1 for Browser')
      t.equal(parts[2], config.accountID, 'third part is set to account ID')
      t.equal(parts[3], config.agentID, 'fourth part is set to app/agent ID')
      t.ok(parts[4], 'span ID is there')
      t.equal(parts[5], '', 'fifth part is empty - no transaction in Browser')
      t.equal(parts[6], '', 'fifth part is set to empty to defer sampling decision to next hop')
      t.equal(parts[7], '', 'priority is not set')
      t.ok(parts[8], 'timestamp is there')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('XHR request on same origin has no newrelic header when disabled in configuration', supported, function (t, browser, router) {
  t.plan(3)
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }

  let init = {
    distributed_tracing: {
      enabled: true,
      exclude_newrelic_header: true
    },
    metrics: {
      enabled: false
    }
  }

  const ajaxPromise = router.expect('assetServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })
  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-sameorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }, true))

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.notOk(headers['newrelic'], 'newrelic header should not be present')
      t.ok(headers['traceparent'], 'traceparent header should be present')
      t.ok(headers['tracestate'], 'tracestate header should be present')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('XHR request on different origin has no DT headers', supported, function (t, browser, router) {
  t.plan(3)
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }
  let init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: [
        'https://newrelic.com'
      ]
    },
    metrics: {
      enabled: false
    }
  }

  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-crossorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }))
  const ajaxPromise = router.expect('bamServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.notOk(headers['newrelic'], 'newrelic header should not be present')
      t.notOk(headers['traceparent'], 'traceparent header should not be present')
      t.notOk(headers['tracestate'], 'tracestate header should not be present')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('default headers on XHR request to allowed cross-origin call', supported, function (t, browser, router) {
  t.plan(3)
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }
  let init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: [
        'http://' + router.testServer.bamServer.host + ':' + router.testServer.bamServer.port
      ]
    },
    metrics: {
      enabled: false
    }
  }

  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-crossorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }))
  const ajaxPromise = router.expect('bamServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.ok(headers['newrelic'] != null, 'newrelic header should be present')
      t.ok(headers['traceparent'] == null, 'traceparent header should not be present')
      t.ok(headers['tracestate'] == null, 'tracestate header should not be present')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('headers configuration for cross-origin calls is respected', supported, function (t, browser, router) {
  t.plan(3)
  let config = {
    accountID: '1234',
    agentID: '2468',
    trustKey: '1'
  }
  let init = {
    distributed_tracing: {
      enabled: true,
      cors_use_newrelic_header: false,
      cors_use_tracecontext_headers: true,
      allowed_origins: [
        'http://' + router.testServer.bamServer.host + ':' + router.testServer.bamServer.port
      ]
    },
    metrics: {
      enabled: false
    }
  }

  let loadPromise = browser.get(router.assetURL('spa/dt/xhr-dt-crossorigin-load.html',
    { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }))
  const ajaxPromise = router.expect('bamServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/dt/${router.testId}`
    }
  })

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request: { headers } }]) => {
      t.ok(headers['newrelic'] == null, 'newrelic header should not be present')
      t.ok(headers['traceparent'] != null, 'traceparent header should be present')
      t.ok(headers['tracestate'] != null, 'tracestate header should be present')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
