/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const mockPveCtor = jest.fn()
const mockReportWarnings = jest.fn()
const mockConfigure = jest.fn()

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
      mockConfigure()
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

  jest.doMock('../../../src/common/dispatch/report-warnings', () => ({
    __esModule: true,
    reportWarnings: mockReportWarnings
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

describe('Agent counts the warnings it gives', () => {
  const build = async (options = {}) => {
    const { Agent } = await import('../../../src/loaders/agent')
    return new Agent({ info: { licenseKey: 'license', applicationID: 'app-id' }, ...options })
  }

  test('starts before configure(), so the warnings about invalid init settings are included', async () => {
    mockReportWarnings.mockImplementation(() => expect(mockConfigure).not.toHaveBeenCalled())

    await build()

    expect(mockReportWarnings).toHaveBeenCalledTimes(1)
    expect(mockConfigure).toHaveBeenCalledTimes(1)
  })

  test('reports on the agent\'s own emitter', async () => {
    const { ee } = await import('../../../src/common/event-emitter/contextual-ee')

    await build()

    expect(mockReportWarnings.mock.calls[0][0]).toBe(ee.get('agent-id'))
  })

  test('counts while init does not exist yet, and while the metrics feature is on', async () => {
    const agent = await build()
    const isEnabled = mockReportWarnings.mock.calls[0][1]

    delete agent.init
    expect(isEnabled()).toBe(true)
    agent.init = { metrics: { enabled: true } }
    expect(isEnabled()).toBe(true)
    agent.init = {}
    expect(isEnabled()).toBe(true)
  })

  test('stops counting when the metrics feature is turned off, because nothing would drain the metrics', async () => {
    const agent = await build({ init: { metrics: { enabled: false }, feature_flags: [] } })

    expect(mockReportWarnings.mock.calls[0][1]()).toBe(false)
    expect(agent.init.metrics.enabled).toBe(false)
  })
})
