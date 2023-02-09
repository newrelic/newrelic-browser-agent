/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const Matcher = require('../../../tools/jil/util/browser-matcher')
const querypack = require('@newrelic/nr-querypack')

const condition = (e) => e.type === 'ajax' && e.path === '/json'

function getXhrFromResponse (response, browser) {
  const target = response?.body || response?.query || null
  if (!target) return null
  const parsed = typeof target === 'string' ? JSON.parse(target).xhr : target.xhr
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
}

function fail (t, addlMsg = undefined) {
  return (err) => {
    t.error(err, addlMsg)
    t.end()
  }
}
// DT-header test helpers

// test cases representing different configurations for same or cross origin calls
// `newrelicHeader` and `traceContextHeaders` specify whether headers should be present
const testCases = [
  {
    name: 'no headers added when feature is not enabled',
    configuration: null,
    sameOrigin: true,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'headers are added on same origin by default',
    configuration: {
      enabled: true
    },
    sameOrigin: true,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on same origin when specifically disabled in configuration',
    configuration: {
      enabled: true,
      exclude_newrelic_header: true
    },
    sameOrigin: true,
    newrelicHeader: false,
    traceContextHeaders: true
  },
  {
    name: 'no headers are added on different origin by default',
    configuration: null,
    sameOrigin: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'no headers are added on different origin when the origin is not allowed',
    configuration: {
      enabled: true,
      allowed_origins: ['https://newrelic.com']
    },
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'default headers on different origin when the origin is allowed',
    configuration: {
      enabled: true,
      allowed_origins: []
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: false
  },
  {
    name: 'trace context headers are added on different origin when explicitly enabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_tracecontext_headers: true
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on different origin when explicitly disabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_newrelic_header: false
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: false,
    traceContextHeaders: false
  }
]

function validateNewrelicHeader (t, headers, config) {
  t.ok(headers['newrelic'], 'newrelic header should be present')

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
}

function validateNoNewrelicHeader (t, headers) {
  t.notOk(headers['newrelic'], 'newrelic header should not be present')
}

function validateTraceContextHeaders (t, headers, config) {
  t.ok(headers['traceparent'], 'traceparent header should be present')
  t.ok(headers['tracestate'], 'tracestate header should be present')

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
}

function validateNoTraceContextHeaders (t, headers) {
  t.notOk(headers['traceparent'], 'traceparent header should not be present')
  t.notOk(headers['tracestate'], 'tracestate header should not be present')
}

module.exports = {
  getXhrFromResponse,
  fail,
  condition,
  querypack,
  testCases,
  validateNewrelicHeader,
  validateNoNewrelicHeader,
  validateTraceContextHeaders,
  validateNoTraceContextHeaders
}
