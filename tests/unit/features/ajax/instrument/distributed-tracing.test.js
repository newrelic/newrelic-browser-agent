import { faker } from '@faker-js/faker'
import { DT } from '../../../../../src/features/ajax/instrument/distributed-tracing'
import * as runtimeModule from '../../../../../src/common/constants/runtime'
import { warn } from '../../../../../src/common/util/console'

jest.enableAutomock()
jest.unmock('../../../../../src/features/ajax/instrument/distributed-tracing')
jest.unmock('../../../../../src/common/deny-list/deny-list')

let agent
let dtInstance

beforeEach(() => {
  warn.mockClear()
  const agentIdentifier = faker.string.uuid()
  agent = {
    agentIdentifier,
    loader_config: {
      accountID: '1234',
      agentID: '5678',
      trustKey: '1'
    }
  }
  dtInstance = new DT(agent)
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('newrelic header has the correct format', () => {
  agent.init = {
    distributed_tracing: { enabled: true }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(payload.timestamp).toEqual(header.d.ti)

  const loaderConfig = agent.loader_config
  expect(header.d.ty).toEqual('Browser')
  expect(header.d.ac).toEqual(loaderConfig.accountID)
  expect(header.d.ap).toEqual(loaderConfig.agentID)
  expect(header.d.tk).toEqual(loaderConfig.trustKey)
})

test('newrelic header is not generated for same-origin calls when disabled in configuration', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      exclude_newrelic_header: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })

  expect(payload.newrelicHeader).toBeUndefined()
  expect(typeof payload.traceContextParentHeader).toEqual('string')
  expect(typeof payload.traceContextStateHeader).toEqual('string')
})

test('newrelic header is added to cross-origin calls by default', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com']
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.newrelicHeader).not.toBeUndefined()
})

test('newrelic header is added to cross-origin calls when enabled in configuration', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_newrelic_header: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.newrelicHeader).not.toBeUndefined()
})

test('newrelic header is not added to cross-origin calls when disabled in configuration', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_newrelic_header: false
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.newrelicHeader).toBeUndefined()
})

test('trace context headers are generated with the correct format', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })
  const parentHeader = payload.traceContextParentHeader
  const stateHeader = payload.traceContextStateHeader

  const parentHeaderParts = parentHeader.split('-')
  expect(parentHeaderParts[0]).toEqual('00')
  expect(parentHeaderParts[1]).toEqual(payload.traceId)
  expect(parentHeaderParts[2]).toEqual(payload.spanId)
  expect(parentHeaderParts[3]).toEqual('01')

  const loaderConfig = agent.loader_config
  const stateHeaderKey = stateHeader.substring(0, stateHeader.indexOf('='))
  expect(stateHeaderKey).toEqual(`${loaderConfig.trustKey}@nr`)

  const stateHeaderParts = stateHeader.substring(stateHeader.indexOf('=') + 1).split('-')
  expect(stateHeaderParts[0]).toEqual('0')
  expect(stateHeaderParts[1]).toEqual('1')
  expect(stateHeaderParts[2]).toEqual(loaderConfig.accountID)
  expect(stateHeaderParts[3]).toEqual(loaderConfig.agentID)
  expect(stateHeaderParts[4]).toEqual(payload.spanId)
  expect(stateHeaderParts[5]).toEqual('')
  expect(stateHeaderParts[6]).toEqual('')
  expect(stateHeaderParts[7]).toEqual('')
  expect(stateHeaderParts[8]).toEqual(payload.timestamp.toString())
})

test('trace context headers are not added to cross-origin calls by default', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com']
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.traceContextParentHeader).toBeUndefined()
  expect(payload.traceContextStateHeader).toBeUndefined()
})

test('trace context headers are added to cross-origin calls when enabled in configuration', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_tracecontext_headers: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.traceContextParentHeader).not.toBeUndefined()
  expect(payload.traceContextStateHeader).not.toBeUndefined()
})

test('trace context headers are not added to cross-origin calls when disabled in configuration', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com'],
      cors_use_tracecontext_headers: false
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: false,
    hostname: 'someotherdomain.com',
    protocol: 'https',
    port: '443'
  })

  expect(payload.traceContextParentHeader).toBeUndefined()
  expect(payload.traceContextStateHeader).toBeUndefined()
})

test('newrelic header is generated when configuration has numeric values', () => {
  agent.loader_config = {
    accountID: 1234,
    agentID: 5678,
    trustKey: 1
  }

  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(payload.timestamp).toEqual(header.d.ti)

  const loaderConfig = agent.loader_config
  expect(header.d.ty).toEqual('Browser')
  expect(header.d.ac).toEqual(loaderConfig.accountID.toString())
  expect(header.d.ap).toEqual(loaderConfig.agentID.toString())
  expect(header.d.tk).toEqual(loaderConfig.trustKey.toString())
})

test('no trace headers are generated when the loader config object is empty', () => {
  agent.init = {
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })

  expect(payload).toBeNull()
})

test.each([null, undefined])('no trace headers are generated when the loader config accountID is %s', (accountID) => {
  agent.loader_config = {
    accountID,
    agentID: '5678',
    trustKey: '1'
  }

  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })

  expect(payload).toBeNull()
})

test.each([null, undefined])('no trace headers are generated when the loader config agentID is %s', (agentID) => {
  agent.loader_config = {
    accountID: '1234',
    agentID,
    trustKey: '1'
  }

  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })

  expect(payload).toBeNull()
})

test.each([null, undefined])('trace headers are generated without trust key when the loader config trustKey is %s', (trustKey) => {
  agent.loader_config = {
    accountID: '1234',
    agentID: '5678',
    trustKey
  }

  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(payload.timestamp).toEqual(header.d.ti)

  const loaderConfig = agent.loader_config
  expect(header.d.ty).toEqual('Browser')
  expect(header.d.ac).toEqual(loaderConfig.accountID.toString())
  expect(header.d.ap).toEqual(loaderConfig.agentID.toString())
  expect(header.d.tk).toBeUndefined()
})

test('timestamp is corrected to NR server time when timeKeeper is ready', () => {
  const rawNow = 1700000000123
  const correctedNow = 1700000000000
  jest.spyOn(Date, 'now').mockReturnValue(rawNow)

  const correctAbsoluteTimestamp = jest.fn().mockReturnValue(correctedNow)
  agent.runtime = {
    timeKeeper: {
      ready: true,
      correctAbsoluteTimestamp
    }
  }
  agent.init = {
    distributed_tracing: { enabled: true }
  }

  const payload = dtInstance.generateTracePayload({ sameOrigin: true })

  expect(correctAbsoluteTimestamp).toHaveBeenCalledWith(rawNow)
  expect(payload.timestamp).toEqual(rawNow)
  expect(payload.timestampCorrected).toEqual(correctedNow)

  const header = JSON.parse(atob(payload.newrelicHeader))
  expect(header.d.ti).toEqual(correctedNow)

  const stateHeaderParts = payload.traceContextStateHeader.split('-')
  expect(stateHeaderParts[stateHeaderParts.length - 1]).toEqual(correctedNow.toString())
})

test('timestamp is not corrected when timeKeeper exists but is not ready', () => {
  const rawNow = 1700000000123
  jest.spyOn(Date, 'now').mockReturnValue(rawNow)

  const correctAbsoluteTimestamp = jest.fn()
  agent.runtime = {
    timeKeeper: {
      ready: false,
      correctAbsoluteTimestamp
    }
  }
  agent.init = {
    distributed_tracing: { enabled: true }
  }

  const payload = dtInstance.generateTracePayload({ sameOrigin: true })

  expect(correctAbsoluteTimestamp).not.toHaveBeenCalled()
  expect(payload.timestamp).toEqual(rawNow)
  expect(payload.timestampCorrected).toBeUndefined()
})

test('timestamp is not corrected when timeKeeper has not been instantiated yet', () => {
  const rawNow = 1700000000123
  jest.spyOn(Date, 'now').mockReturnValue(rawNow)

  // agent.runtime is intentionally left undefined here, matching the real agent's state before
  // configure()/connect() has run and populated agentRef.runtime.timeKeeper
  agent.init = {
    distributed_tracing: { enabled: true }
  }

  const payload = dtInstance.generateTracePayload({ sameOrigin: true })

  expect(payload.timestamp).toEqual(rawNow)
  expect(payload.timestampCorrected).toBeUndefined()
})

test.each([null, undefined])('newrelic header is not added when btoa global is %s', (replacementBTOA) => {
  jest.replaceProperty(runtimeModule, 'globalScope', {
    btoa: replacementBTOA
  })

  agent.init = {
    distributed_tracing: {
      enabled: true
    }
  }

  const payload = dtInstance.generateTracePayload({
    sameOrigin: true
  })

  expect(typeof payload.spanId).toEqual('string')
  expect(typeof payload.traceId).toEqual('string')
  expect(typeof payload.timestamp).toEqual('number')
  expect(typeof payload.traceContextParentHeader).toEqual('string')
  expect(typeof payload.traceContextStateHeader).toEqual('string')
  expect(payload.header).toBeUndefined()
})

describe('allowed_origins wildcard matching', () => {
  const crossOrigin = (hostname, protocol = 'https', port = '443') => ({ sameOrigin: false, hostname, protocol, port })

  function isAllowed (allowedOrigins, origin) {
    agent.init = { distributed_tracing: { enabled: true, allowed_origins: allowedOrigins } }
    return dtInstance.isAllowedOrigin(origin)
  }

  test.each([
    ['https://*.foo.bar', 'a.foo.bar'],
    ['https://*.foo.bar', 'a.b.foo.bar'],
    ['https://api-*.foo.bar', 'api-v2.foo.bar'],
    ['https://foo.*', 'foo.com'],
    ['https://*.FOO.bar', 'a.foo.bar'],
    ['https://*.foo.bar/some/path', 'a.foo.bar'],
    ['https://%2A.foo.bar', 'a.foo.bar'],
    ['https://%2a.foo.bar', 'a.foo.bar']
  ])('wildcard entry %s allows %s', (entry, hostname) => {
    expect(isAllowed([entry], crossOrigin(hostname))).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  test.each([
    ['https://*.foo.bar', 'foo.bar'],
    ['https://*.foo.bar', 'evilfoo.bar'],
    ['https://*.foo.bar', 'foo.bar.evil.com'],
    ['https://foo*', 'evilfoo.com'],
    ['https://*foo.bar', 'foo.bar.evil.com']
  ])('wildcard entry %s does not allow look-alike host %s', (entry, hostname) => {
    expect(isAllowed([entry], crossOrigin(hostname))).toBe(false)
  })

  test('wildcard entry requires an exact protocol match', () => {
    expect(isAllowed(['https://*.foo.bar'], crossOrigin('a.foo.bar', 'http', '80'))).toBe(false)
  })

  test('wildcard entry requires an exact port match', () => {
    expect(isAllowed(['https://*.foo.bar'], crossOrigin('a.foo.bar', 'https', '8443'))).toBe(false)
    expect(isAllowed(['https://*.foo.bar:8443'], crossOrigin('a.foo.bar', 'https', '8443'))).toBe(true)
    expect(isAllowed(['https://*.foo.bar:8443'], crossOrigin('a.foo.bar', 'https', '443'))).toBe(false)
  })

  test.each([
    ['https://*.foo.bar', 'https', '443'],
    ['http://*.foo.bar', 'http', '80']
  ])('wildcard entry %s defaults to the standard port for its protocol', (entry, protocol, port) => {
    expect(isAllowed([entry], crossOrigin('a.foo.bar', protocol, port))).toBe(true)
  })

  test.each([
    'https://*',
    'https://**',
    'https://*.*',
    'https://*.*.*',
    'https://*:443',
    '*.foo.bar',
    'ftp://*.foo.bar',
    'https://*.foo.bar:*'
  ])('invalid wildcard entry %s warns and allows nothing', (entry) => {
    expect(isAllowed([entry], crossOrigin('a.foo.bar'))).toBe(false)
    expect(isAllowed([entry], crossOrigin('a.b.c'))).toBe(false)
    expect(warn).toHaveBeenCalledWith(83, entry)
  })

  test('an invalid wildcard entry only warns once, not on every request', () => {
    agent.init = { distributed_tracing: { enabled: true, allowed_origins: ['https://*'] } }

    dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))
    dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))
    dtInstance.isAllowedOrigin(crossOrigin('b.foo.bar'))

    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('an invalid wildcard entry does not block other valid entries', () => {
    expect(isAllowed(['https://*', 'https://*.foo.bar'], crossOrigin('a.foo.bar'))).toBe(true)
  })

  test('exact entries still compare hostnames literally', () => {
    expect(isAllowed(['https://someotherdomain.com'], crossOrigin('someotherdomain.com'))).toBe(true)
    expect(isAllowed(['https://someotherdomain.com'], crossOrigin('someotherdomainxcom'))).toBe(false)
    expect(isAllowed(['https://someotherdomain.com'], crossOrigin('a.someotherdomain.com'))).toBe(false)
  })

  test('mixed lists of exact and wildcard entries are all honored', () => {
    const list = ['https://exact.com', 'https://*.foo.bar']

    expect(isAllowed(list, crossOrigin('exact.com'))).toBe(true)
    expect(isAllowed(list, crossOrigin('a.foo.bar'))).toBe(true)
    expect(isAllowed(list, crossOrigin('other.com'))).toBe(false)
  })

  test.each([undefined, null, 'https://*.foo.bar', {}, []])('allowed_origins value %p allows no cross-origin hosts', (value) => {
    expect(isAllowed(value, crossOrigin('a.foo.bar'))).toBe(false)
  })

  test('non-string entries do not throw and do not match', () => {
    expect(() => isAllowed([null, undefined, 123, {}], crossOrigin('a.foo.bar'))).not.toThrow()
    expect(isAllowed([null, undefined, 123, {}], crossOrigin('a.foo.bar'))).toBe(false)
  })

  test('same-origin requests are allowed regardless of the list', () => {
    expect(isAllowed(['https://*'], { sameOrigin: true })).toBe(true)
  })

  test('matchers are recompiled when entries are pushed onto the list', () => {
    agent.init = { distributed_tracing: { enabled: true, allowed_origins: ['https://*.foo.bar'] } }
    expect(dtInstance.isAllowedOrigin(crossOrigin('x.baz.com'))).toBe(false)

    agent.init.distributed_tracing.allowed_origins.push('https://*.baz.com')

    expect(dtInstance.isAllowedOrigin(crossOrigin('x.baz.com'))).toBe(true)
    expect(dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))).toBe(true)
  })

  test('matchers are recompiled when the list is reassigned', () => {
    agent.init = { distributed_tracing: { enabled: true, allowed_origins: ['https://*.foo.bar'] } }
    expect(dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))).toBe(true)

    agent.init.distributed_tracing.allowed_origins = ['https://*.baz.com']

    expect(dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))).toBe(false)
    expect(dtInstance.isAllowedOrigin(crossOrigin('x.baz.com'))).toBe(true)
  })

  test('matchers are recompiled when an entry is replaced in place', () => {
    agent.init = { distributed_tracing: { enabled: true, allowed_origins: ['https://*.foo.bar'] } }
    expect(dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))).toBe(true)

    agent.init.distributed_tracing.allowed_origins[0] = 'https://*.baz.com'

    expect(dtInstance.isAllowedOrigin(crossOrigin('a.foo.bar'))).toBe(false)
    expect(dtInstance.isAllowedOrigin(crossOrigin('x.baz.com'))).toBe(true)
  })

  test('trace headers are generated for a host matched by a wildcard entry', () => {
    agent.init = {
      distributed_tracing: {
        enabled: true,
        allowed_origins: ['https://*.foo.bar'],
        cors_use_tracecontext_headers: true
      }
    }

    const payload = dtInstance.generateTracePayload(crossOrigin('a.foo.bar'))

    expect(payload.newrelicHeader).not.toBeUndefined()
    expect(payload.traceContextParentHeader).not.toBeUndefined()
  })

  test('no trace payload is generated for a host that a wildcard entry does not match', () => {
    agent.init = {
      distributed_tracing: {
        enabled: true,
        allowed_origins: ['https://*.foo.bar'],
        cors_use_tracecontext_headers: true
      }
    }

    expect(dtInstance.generateTracePayload(crossOrigin('evilfoo.bar'))).toBeNull()
  })
})
