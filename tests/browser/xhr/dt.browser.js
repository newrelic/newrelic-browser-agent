/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import { setup } from '../utils/setup'
import { DT } from '../../../packages/browser-agent-core/features/ajax/instrument/distributed-tracing'
import { setLoaderConfig, getLoaderConfig, setConfiguration } from '../../../packages/browser-agent-core/common/config/config'

const { agentIdentifier } = setup();
const distributedTracing = new DT(agentIdentifier);
const generateTracePayload = distributedTracing.generateTracePayload;
const shouldGenerateTrace = distributedTracing.shouldGenerateTrace;


var supportsBase64 = ('atob' in window)
var parsedOrigin = {
  sameOrigin: true
}

test('newrelic header has the correct format', function (t) {
  if (!supportsBase64) {
    t.skip('atob function is required for this test')
    t.end()
    return
  }

  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = distributedTracing.generateTracePayload(parsedOrigin)
  var header = JSON.parse(atob(payload.newrelicHeader))

  t.ok(payload, 'payload is not null')
  t.ok(payload.spanId, 'spanId is not null')
  t.equal(payload.spanId, header.d.id, 'spanId is the same as id in header')
  t.ok(payload.traceId, 'traceId is not null')
  t.equal(payload.traceId, header.d.tr, 'traceId is the same as tr in header')
  t.ok(payload.timestamp, 'timestamp is not null')
  t.equal(payload.timestamp, header.d.ti, 'timestamp is the same as ti in header')

  const loadercfg = getLoaderConfig(agentIdentifier);
  t.deepEqual(header.v, [0, 1], 'version in header is set')
  t.equal(header.d.ty, 'Browser', 'type in header is set to Browser')
  t.equal(header.d.ac, loadercfg.accountID, 'ac in header is set to account')
  t.equal(header.d.ap, loadercfg.agentID, 'ap in header is set to app/agent ID')
  t.equal(header.d.tk, loadercfg.trustKey, 'tk in header is set to trust key')
  t.end()
})

test('newrelic header is not generated for same-origin calls when disabled in configuration', function (t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      exclude_newrelic_header: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)
  t.ok(payload.newrelicHeader == null, 'newrelicHeader should not be generated')
  t.ok(payload.traceContextParentHeader != null, 'traceparent header should be generated')
  t.ok(payload.traceContextStateHeader != null, 'tracestate header should be generated')
  t.end()
})

test('newrelic header is added to cross-origin calls by default', function(t) {
  if (!supportsBase64) {
    t.skip('atob function is required for this test')
    t.end()
    return
  }

  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com']
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var header = payload.newrelicHeader

  t.ok(header != null, 'newrelic header should be generated')

  t.end()
})

test('newrelic header is added to cross-origin calls when enabled in configuration', function(t) {
  if (!supportsBase64) {
    t.skip('atob function is required for this test')
    t.end()
    return
  }

  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_newrelic_header: true
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var header = payload.newrelicHeader

  t.ok(header != null, 'newrelic header should be generated')

  t.end()
})

test('newrelic header is not added to cross-origin calls when disabled in configuration', function(t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_newrelic_header: false
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var header = payload.newrelicHeader

  t.ok(header == null, 'newrelic header should be empty')

  t.end()
})

test('TraceContext headers are generated with the correct format', function (t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)
  var parentHeader = payload.traceContextParentHeader
  var stateHeader = payload.traceContextStateHeader

  var parts = parentHeader.split('-')
  t.equal(parts.length, 4, 'parent header should have four parts')
  t.equal(parts[0], '00', 'first part should be format version set to 00')
  t.equal(parts[1], payload.traceId, 'second part should be the trace ID')
  t.equal(parts[2], payload.spanId, 'third part should be the span ID')
  t.equal(parts[3], '01', 'fourth part should be set to sampled flag')

  const loadercfg = getLoaderConfig(agentIdentifier);
  var key = stateHeader.substring(0, stateHeader.indexOf('='))
  t.equal(key, loadercfg.trustKey + '@nr', 'key should be in the right format')

  parts = stateHeader.substring(stateHeader.indexOf('=') + 1).split('-')
  t.equal(parts.length, 9, 'state header should have nine parts')
  t.equal(parts[0], '0', 'version is set to 0')
  t.equal(parts[1], '1', 'parent type is set to 1 for Browser')
  t.equal(parts[2], loadercfg.accountID, 'third part is set to account ID')
  t.equal(parts[3], loadercfg.agentID, 'fourth part is set to app/agent ID')
  t.equal(parts[4], payload.spanId, 'fourth part is set to span ID')
  t.equal(parts[5], '', 'fifth part is empty - no transaction in Browser')
  t.equal(parts[6], '', 'fifth part is set to empty to defer sampling decision to next hop')
  t.equal(parts[7], '', 'priority is not set')
  t.equal(parts[8], payload.timestamp.toString(), 'last part is set to timestamp')

  t.end()
})

test('TraceContext headers are not added to cross-origin calls by default', function(t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com']
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var parentHeader = payload.traceContextParentHeader
  var stateHeader = payload.traceContextStateHeader

  t.ok(parentHeader == null, 'traceparent header should be empty')
  t.ok(stateHeader == null, 'tracestate header should be empty')

  t.end()
})

test('TraceContext headers are added to cross-origin calls when enabled in configuration', function(t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_tracecontext_headers: true
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var parentHeader = payload.traceContextParentHeader
  var stateHeader = payload.traceContextStateHeader

  t.ok(parentHeader != null, 'traceparent header should be generated')
  t.ok(stateHeader != null, 'tracestate header should be generated')

  t.end()
})

test('TraceContext headers are not added to cross-origin calls when disabled in configuration', function(t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_tracecontext_headers: false
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  }

  var payload = generateTracePayload(otherParsedOrigin)
  var parentHeader = payload.traceContextParentHeader
  var stateHeader = payload.traceContextStateHeader

  t.ok(parentHeader == null, 'traceparent header should be empty')
  t.ok(stateHeader == null, 'tracestate header should be empty')

  t.end()
})

// regression test
test('newrelic header is generated when configuration has numeric values', function (t) {
  if (!supportsBase64) {
    t.skip('atob function is required for this test')
    t.end()
    return
  }

  setLoaderConfig(agentIdentifier, {
    accountID: 1234,
    agentID: 5678,
    trustKey: 1
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)
  var header = JSON.parse(atob(payload.newrelicHeader))

  t.ok(payload, 'payload is not null')
  t.ok(payload.spanId)
  t.equal(payload.spanId, header.d.id)
  t.ok(payload.traceId)
  t.equal(payload.traceId, header.d.tr)
  t.ok(payload.timestamp)
  t.equal(payload.timestamp, header.d.ti)

  t.deepEqual(header.v, [0, 1])
  t.equal(header.d.ty, 'Browser')
  t.equal(header.d.ac, '1234')
  t.equal(header.d.ap, '5678')
  t.equal(header.d.tk, '1')
  t.ok(header.d.id)
  t.ok(header.d.tr)
  t.ok(header.d.ti)
  t.end()
})

test('NREUM.loader_config object is empty - no DT headers are generated', function (t) {
  setLoaderConfig(agentIdentifier, {});
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)

  t.notOk(payload, 'payload is null')
  t.end()
})

test('accountID is missing - no header generated', function (t) {
  setLoaderConfig(agentIdentifier, {
    accountID: null,
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)

  t.notOk(payload, 'payload is null')
  t.end()
})

test('agentID is missing - no header generated', function (t) {
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: null,
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)

  t.notOk(payload, 'payload is null')
  t.end()
})

test('trustKey is missing - header generated, trustKey won\'t be in header', function (t) {
  if (!supportsBase64) {
    t.skip('atob function is required for this test')
    t.end()
    return
  }

  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: null
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var payload = generateTracePayload(parsedOrigin)
  var header = JSON.parse(atob(payload.newrelicHeader))

  t.ok(payload, 'payload is not null')
  t.ok(payload.spanId)
  t.equal(payload.spanId, header.d.id)
  t.ok(payload.traceId)
  t.equal(payload.traceId, header.d.tr)
  t.ok(payload.timestamp)
  t.equal(payload.timestamp, header.d.ti)

  const loadercfg = getLoaderConfig(agentIdentifier);
  t.deepEqual(header.v, [0, 1])
  t.equal(header.d.ty, 'Browser')
  t.equal(header.d.ac, loadercfg.accountID)
  t.equal(header.d.ap, loadercfg.agentID)
  t.notOk(header.d.tk)
  t.ok(header.d.id)
  t.ok(header.d.tr)
  t.ok(header.d.ti)
  t.end()
})

test('window.btoa is missing - no header generated', function (t) {
  /* eslint-disable no-native-reassign */
  setLoaderConfig(agentIdentifier, {
    accountID: '1234',
    agentID: '5678',
    trustKey: '1'
  });
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var originalBtoa = window.btoa
  delete window.btoa

  var payload = generateTracePayload(parsedOrigin)
  t.ok(true)

  t.ok(payload, 'payload is not null')
  t.ok(payload.spanId)
  t.ok(payload.traceId)
  t.ok(payload.timestamp)
  t.notOk(payload.header)

  window.btoa = originalBtoa
  t.end()
  /* eslint-enable */
})

test('NREUM.init object has no DT section - shouldGenerateTrace is false', function (t) {
  setConfiguration(agentIdentifier, {});

  var result = shouldGenerateTrace(parsedOrigin)

  t.equal(result, false)
  t.end()
})

test('NREUM.loader_config object has dt enabled/same origin - shouldGenerateTrace is true', function (t) {
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true
    }
  });

  var result = shouldGenerateTrace(parsedOrigin)

  t.equal(result, true)
  t.end()
})

test('NREUM.loader_config object has dt enabled/allowed CORS origin - shouldGenerateTrace is true', function (t) {
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://newrelic.com']
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'newrelic.com',
    protocol: 'https',
    port: '443'
  }
  var result = shouldGenerateTrace(otherParsedOrigin)

  t.equal(result, true)
  t.end()
})

test('NREUM.loader_config object has dt enabled/disallowed CORS origin - shouldGenerateTrace is false', function (t) {
  setConfiguration(agentIdentifier, {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://newrelic.com']
    }
  });

  var otherParsedOrigin = {
    sameOrigin: false,
    hostname: 'notnewrelic.com',
    protocol: 'https',
    port: '443'
  }
  var result = shouldGenerateTrace(otherParsedOrigin)

  t.equal(result, false)
  t.end()
})
