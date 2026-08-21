/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const mockPveCtor = jest.fn()

class MockPageViewEvent {
  static featureName = 'page_view_event'

  constructor () {
    mockPveCtor()
  }
}

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()

  jest.doMock('../../../src/loaders/agent-base', () => ({
    __esModule: true,
    AgentBase: class {
      constructor () {
        this.agentIdentifier = 'agent-id'
      }
    }
  }))

  jest.doMock('../../../src/loaders/features/enabled-features', () => ({
    __esModule: true,
    getEnabledFeatures: jest.fn(() => ({ page_view_event: false }))
  }))

  jest.doMock('../../../src/loaders/configure/configure', () => ({
    __esModule: true,
    configure: jest.fn((agent, options) => {
      agent.info = options.info || { licenseKey: 'license', applicationID: 'app-id' }
      agent.init = options.init || { feature_flags: [] }
      agent.loader_config = options.loader_config || {}
      agent.runtime = options.runtime || {}
    })
  }))

  jest.doMock('../../../src/loaders/features/featureDependencies', () => ({
    __esModule: true,
    getFeatureDependencyNames: jest.fn(() => [])
  }))

  jest.doMock('../../../src/loaders/features/features', () => ({
    __esModule: true,
    featurePriority: { page_view_event: 1 },
    FEATURE_NAMES: { pageViewEvent: 'page_view_event' }
  }))

  jest.doMock('../../../src/features/page_view_event/instrument', () => ({
    __esModule: true,
    Instrument: MockPageViewEvent
  }))

  jest.doMock('../../../src/common/window/nreum', () => ({
    __esModule: true,
    gosNREUM: jest.fn(() => ({ initializedAgents: { 'agent-id': {} }, ee: { get: jest.fn(() => ({ abort: jest.fn() })) } })),
    setNREUMInitializedAgent: jest.fn()
  }))

  jest.doMock('../../../src/common/util/console', () => ({
    __esModule: true,
    warn: jest.fn()
  }))

  jest.doMock('../../../src/common/constants/runtime', () => ({
    __esModule: true,
    globalScope: {}
  }))

  jest.doMock('../../../src/loaders/api/setCustomAttribute', () => ({ __esModule: true, setupSetCustomAttributeAPI: jest.fn() }))
  jest.doMock('../../../src/loaders/api/setUserId', () => ({ __esModule: true, setupSetUserIdAPI: jest.fn() }))
  jest.doMock('../../../src/loaders/api/setApplicationVersion', () => ({ __esModule: true, setupSetApplicationVersionAPI: jest.fn() }))
  jest.doMock('../../../src/loaders/api/start', () => ({ __esModule: true, setupStartAPI: jest.fn() }))
  jest.doMock('../../../src/loaders/api/consent', () => ({ __esModule: true, setupConsentAPI: jest.fn() }))
})

describe('Agent run behavior with rum_v2', () => {
  test('keeps page_view_event when rum_v2 is disabled even if feature is disabled', async () => {
    const { Agent } = await import('../../../src/loaders/agent')

    new Agent({
      info: { licenseKey: 'license', applicationID: 'app-id' },
      init: { feature_flags: [] },
      features: []
    })

    expect(mockPveCtor).toHaveBeenCalledTimes(1)
  })

  test('skips page_view_event when rum_v2 is enabled and feature is disabled', async () => {
    const { Agent } = await import('../../../src/loaders/agent')

    new Agent({
      info: { licenseKey: 'license', applicationID: 'app-id' },
      init: { feature_flags: ['rum_v2'] },
      features: []
    })

    expect(mockPveCtor).not.toHaveBeenCalled()
  })
})
