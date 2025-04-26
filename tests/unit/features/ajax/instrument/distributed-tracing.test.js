import { faker } from '@faker-js/faker'
import { DT } from '../../../../../src/features/ajax/instrument/distributed-tracing'
import * as runtimeModule from '../../../../../src/common/constants/runtime'

jest.enableAutomock()
jest.unmock('../../../../../src/features/ajax/instrument/distributed-tracing')

let agent
let dtInstance

beforeEach(() => {
  const agentIdentifier = faker.string.uuid()
  agent = {
    agentIdentifier,
    loader_config: {
      accountID: '1234',
      agentID: '5678',
      trustKey: '1'
    },
    runtime: {
      timeKeeper: {
        correctAbsoluteTimestamp: jest.fn(() => Date.now())
      }
    }
  }
  dtInstance = new DT(agent)
})

test('newrelic header has the correct format', () => {
  agent.init = {
    distributed_tracing: { enabled: true }
  }

  const payload = dtInstance.generateTracePayload(agent, {
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(agent.runtime.timeKeeper.correctAbsoluteTimestamp).toHaveBeenCalled()
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  expect(agent.runtime.timeKeeper.correctAbsoluteTimestamp).toHaveBeenCalled()
})

test('trace context headers are not added to cross-origin calls by default', () => {
  agent.init = {
    distributed_tracing: {
      enabled: true,
      allowed_origins: ['https://someotherdomain.com']
    }
  }

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(payload.timestamp).toEqual(header.d.ti)
  expect(agent.runtime.timeKeeper.correctAbsoluteTimestamp).toHaveBeenCalled()

  const loaderConfig = agent.loader_config
  expect(header.d.ty).toEqual('Browser')
  expect(header.d.ac).toEqual(loaderConfig.accountID.toString())
  expect(header.d.ap).toEqual(loaderConfig.agentID.toString())
  expect(header.d.tk).toEqual(loaderConfig.trustKey.toString())
})

test('no trace headers are generated when the loader config object is empty', () => {
  agent.init = {
  }

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
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

  const payload = dtInstance.generateTracePayload(agent, {
    sameOrigin: true
  })
  const header = JSON.parse(atob(payload.newrelicHeader))

  expect(payload.spanId).toEqual(header.d.id)
  expect(payload.traceId).toEqual(header.d.tr)
  expect(payload.timestamp).toEqual(header.d.ti)
  expect(agent.runtime.timeKeeper.correctAbsoluteTimestamp).toHaveBeenCalled()

  const loaderConfig = agent.loader_config
  expect(header.d.ty).toEqual('Browser')
  expect(header.d.ac).toEqual(loaderConfig.accountID.toString())
  expect(header.d.ap).toEqual(loaderConfig.agentID.toString())
  expect(header.d.tk).toBeUndefined()
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

  const payload = dtInstance.generateTracePayload(agent, {
    sameOrigin: true
  })
  expect(agent.runtime.timeKeeper.correctAbsoluteTimestamp).toHaveBeenCalled()

  expect(typeof payload.spanId).toEqual('string')
  expect(typeof payload.traceId).toEqual('string')
  expect(typeof payload.timestamp).toEqual('number')
  expect(typeof payload.traceContextParentHeader).toEqual('string')
  expect(typeof payload.traceContextStateHeader).toEqual('string')
  expect(payload.header).toBeUndefined()
})
