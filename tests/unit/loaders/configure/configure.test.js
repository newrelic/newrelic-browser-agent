/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('configure iframe bridge message pre-filtering', () => {
  let configure
  let mockHandle

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    mockHandle = jest.fn()
    jest.doMock('../../../../src/common/event-emitter/handle', () => ({
      handle: mockHandle
    }))

    const module = await import('../../../../src/loaders/configure/configure')
    configure = module.configure
  })

  const buildAgent = () => ({ agentIdentifier: `test-agent-${Math.random()}`, exposed: false })

  const buildOpts = () => ({
    init: { api: { register: { allow_iframe_bridge: true } } },
    info: { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net' },
    runtime: {}
  })

  it('buffers a MessageEvent whose data.type is prefixed for the iframe bridge', () => {
    const agent = buildAgent()
    configure(agent, buildOpts(), 'test-loader')

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'newrelic-iframe-api' } }))

    expect(mockHandle).toHaveBeenCalledWith('iframe-message', [expect.anything()], undefined, 'IFRAME', agent.ee)
  })

  it('does not buffer an unrelated MessageEvent', () => {
    const agent = buildAgent()
    configure(agent, buildOpts(), 'test-loader')

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'some-other-library-event' } }))
    window.dispatchEvent(new MessageEvent('message', { data: 'not even an object' }))
    window.dispatchEvent(new MessageEvent('message', { data: undefined }))

    expect(mockHandle).not.toHaveBeenCalled()
  })

  it('does not register a listener at all when the iframe bridge is disabled', () => {
    const agent = buildAgent()
    const opts = buildOpts()
    opts.init.api.register.allow_iframe_bridge = false
    configure(agent, opts, 'test-loader')

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'newrelic-iframe-api' } }))

    expect(mockHandle).not.toHaveBeenCalled()
  })
})

describe('configure harvest endpoint lock', () => {
  let configure
  let isTrustedBeacon

  beforeEach(async () => {
    jest.resetModules()
    jest.doMock('../../../../src/common/event-emitter/handle', () => ({ handle: jest.fn() }))
    configure = (await import('../../../../src/loaders/configure/configure')).configure
    isTrustedBeacon = (await import('../../../../src/common/config/trusted-beacons')).isTrustedBeacon
  })

  const buildAgent = () => ({ agentIdentifier: `test-agent-${Math.random()}`, exposed: false })
  const buildOpts = (proxy = {}) => ({
    init: { proxy },
    info: { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net' },
    runtime: {}
  })

  it('makes the configured beacons read-only', () => {
    const agent = buildAgent()
    configure(agent, buildOpts({ beacon: 'proxy.example.com/nr' }), 'test-loader')

    expect(() => { agent.info.errorBeacon = 'evil.example.com' }).toThrow(TypeError)
    expect(() => { agent.init.proxy.beacon = 'evil.example.com' }).toThrow(TypeError)
    expect(isTrustedBeacon(agent, 'proxy.example.com/nr')).toBe(true)
    expect(isTrustedBeacon(agent, 'evil.example.com')).toBe(false)
  })

  it('trusts the new proxy beacon when the agent is configured again with a late init', () => {
    const agent = buildAgent()
    configure(agent, buildOpts(), 'test-loader')
    expect(isTrustedBeacon(agent, 'late.example.com')).toBe(false)

    configure(agent, buildOpts({ beacon: 'late.example.com' }), 'test-loader')

    expect(isTrustedBeacon(agent, 'late.example.com')).toBe(true)
  })
})
