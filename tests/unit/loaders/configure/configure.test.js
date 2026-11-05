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

describe('configure internal beacon deny-list entries', () => {
  let configure

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    const module = await import('../../../../src/loaders/configure/configure')
    configure = module.configure
  })

  const buildAgent = () => ({ agentIdentifier: `test-agent-${Math.random()}`, exposed: false })

  const buildOpts = (proxyBeacon, ajax = {}) => ({
    init: { proxy: { beacon: proxyBeacon }, ajax },
    info: { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net' },
    runtime: {}
  })

  it('wildcards a proxied beacon with sub-path', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix'), 'test-loader')

    expect(agent.runtime.denyList).toContain('customer-proxy.com/known-prefix/*')
  })

  it('wildcards a proxied beacon with no path', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com'), 'test-loader')

    expect(agent.runtime.denyList).toContain('customer-proxy.com/*')
  })

  it('collapses multiple trailing slashes on a proxied beacon path', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix///'), 'test-loader')

    expect(agent.runtime.denyList).toContain('customer-proxy.com/known-prefix/*')
  })

  it('does not double up the slash when the proxied beacon path ends in a slash', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix/'), 'test-loader')

    expect(agent.runtime.denyList).toContain('customer-proxy.com/known-prefix/*')
    expect(agent.runtime.denyList).not.toContain('customer-proxy.com/known-prefix//*')
  })

  it('wildcards info beacons', () => {
    const agent = buildAgent()
    configure(agent, buildOpts(undefined), 'test-loader')

    expect(agent.runtime.denyList).toEqual(['bam.nr-data.net/*', 'bam.nr-data.net/*'])
  })

  it('wildcards a proxied assets path', () => {
    const agent = buildAgent()
    const opts = buildOpts(undefined)
    opts.init.proxy.assets = 'cdn.customer.com/assets'
    configure(agent, opts, 'test-loader')

    expect(agent.runtime.denyList).toContain('cdn.customer.com/assets/*')
  })

  it('omits the proxied beacon entry when block_internal is false', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix', { block_internal: false }), 'test-loader')

    expect(agent.runtime.denyList).toEqual([])
  })

  it('leaves customer deny_list entries exactly as configured', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix', { deny_list: ['api.example.com/exact', 'other.example.com/*'] }), 'test-loader')

    expect(agent.runtime.denyList).toEqual(expect.arrayContaining(['api.example.com/exact', 'other.example.com/*']))
    expect(agent.runtime.denyList).not.toContain('api.example.com/exact/*')
  })

  it('keeps agent.beacons raw, without the wildcard suffix', () => {
    const agent = buildAgent()
    configure(agent, buildOpts('customer-proxy.com/known-prefix'), 'test-loader')

    expect(agent.beacons).toContain('customer-proxy.com/known-prefix')
    expect(agent.beacons).not.toContain('customer-proxy.com/known-prefix/*')
  })
})
