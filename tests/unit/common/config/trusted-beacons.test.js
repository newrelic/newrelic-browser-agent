/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { trustBeacons, isTrustedBeacon } from '../../../../src/common/config/trusted-beacons'
import { handle } from '../../../../src/common/event-emitter/handle'

jest.mock('../../../../src/common/event-emitter/handle', () => ({ handle: jest.fn() }))

beforeEach(() => jest.clearAllMocks())

const buildAgent = (proxy = {}) => ({
  ee: { name: 'ee' },
  info: { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net', licenseKey: 'abc', jsAttributes: {} },
  init: { proxy }
})

describe('trustBeacons', () => {
  test('makes info.beacon and info.errorBeacon read-only', () => {
    const agent = buildAgent()
    trustBeacons(agent)

    agent.info.errorBeacon = 'evil.example.com'
    agent.info.beacon = 'evil.example.com'
    expect(() => Object.defineProperty(agent.info, 'errorBeacon', { value: 'evil.example.com' })).toThrow(TypeError)
    expect(agent.info.errorBeacon).toBe('bam.nr-data.net')
  })

  test('makes info.licenseKey and info.applicationID read-only', () => {
    const agent = buildAgent()
    agent.info.applicationID = '123'
    trustBeacons(agent)

    agent.info.licenseKey = 'evil'
    agent.info.applicationID = '999'
    expect(() => Object.defineProperty(agent.info, 'licenseKey', { value: 'evil' })).toThrow(TypeError)
    expect(() => Object.defineProperty(agent.info, 'applicationID', { value: '999' })).toThrow(TypeError)
    expect(agent.info.licenseKey).toBe('abc')
    expect(agent.info.applicationID).toBe('123')
  })

  test('freezes init.proxy', () => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr' })
    trustBeacons(agent)

    agent.init.proxy.beacon = 'evil.example.com'
    expect(agent.init.proxy.beacon).toBe('proxy.example.com/nr')
  })

  test('freezes init.proxy.assets', () => {
    const agent = buildAgent({ assets: 'https://assets.example.com' })
    trustBeacons(agent)

    agent.init.proxy.assets = 'https://evil.example.com'
    expect(() => Object.defineProperty(agent.init.proxy, 'assets', { value: 'https://evil.example.com' })).toThrow(TypeError)
    expect(agent.init.proxy.assets).toBe('https://assets.example.com')
  })

  test('does not freeze the proxy object that was passed in', () => {
    const proxy = { beacon: 'proxy.example.com/nr' }
    trustBeacons(buildAgent(proxy))

    expect(Object.isFrozen(proxy)).toBe(false)
  })

  test('leaves other info fields writable', () => {
    const agent = buildAgent()
    trustBeacons(agent)

    agent.info.jsAttributes.foo = 'bar'
    agent.info.userAttributes = 'x'
    expect(agent.info.jsAttributes.foo).toBe('bar')
    expect(agent.info.userAttributes).toBe('x')
  })
})

describe('locked config write reporting', () => {
  const metricNames = () => handle.mock.calls.map(call => call[1][0])

  test.each([
    ['info.beacon', agent => { agent.info.beacon = 'evil.example.com' }],
    ['info.errorBeacon', agent => { agent.info.errorBeacon = 'evil.example.com' }],
    ['info.licenseKey', agent => { agent.info.licenseKey = 'evil' }],
    ['info.applicationID', agent => { agent.info.applicationID = '999' }],
    ['proxy.beacon', agent => { agent.init.proxy.beacon = 'evil.example.com' }],
    ['proxy.assets', agent => { agent.init.proxy.assets = 'https://evil.example.com' }]
  ])('reports a write to %s as a supportability metric', (label, write) => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr', assets: 'https://assets.example.com' })
    agent.info.applicationID = '123'
    trustBeacons(agent)
    write(agent)

    expect(handle).toHaveBeenCalledWith('storeSupportabilityMetrics', [`Config/Locked/${label}/Changed`], undefined, 'metrics', agent.ee)
  })

  test('does not report when nothing is written', () => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr' })
    trustBeacons(agent)
    const { beacon, errorBeacon, licenseKey } = agent.info
    const copy = { ...agent.info, ...agent.init.proxy }

    expect([beacon, errorBeacon, licenseKey, copy.beacon]).toEqual(['bam.nr-data.net', 'bam.nr-data.net', 'abc', 'proxy.example.com/nr'])
    expect(metricNames()).toEqual([])
  })
})

describe('isTrustedBeacon', () => {
  test('trusts the configured errorBeacon and proxy beacon', () => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr' })
    trustBeacons(agent)

    expect(isTrustedBeacon(agent, 'bam.nr-data.net')).toBe(true)
    expect(isTrustedBeacon(agent, 'proxy.example.com/nr')).toBe(true)
  })

  test('rejects any other destination, including a different path on a trusted host', () => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr' })
    trustBeacons(agent)

    expect(isTrustedBeacon(agent, 'evil.example.com')).toBe(false)
    expect(isTrustedBeacon(agent, 'proxy.example.com/other')).toBe(false)
    expect(isTrustedBeacon(agent, undefined)).toBe(false)
  })

  test('catches a replaced info object, which read-only properties alone do not', () => {
    const agent = buildAgent()
    trustBeacons(agent)
    agent.info = { ...agent.info, errorBeacon: 'evil.example.com' }

    expect(isTrustedBeacon(agent, agent.info.errorBeacon)).toBe(false)
  })

  test('re-configuring replaces the trusted set', () => {
    const agent = buildAgent()
    trustBeacons(agent)
    agent.init = { proxy: { beacon: 'late.example.com' } }
    agent.info = { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net' }
    trustBeacons(agent)

    expect(isTrustedBeacon(agent, 'late.example.com')).toBe(true)
  })

  test('does not restrict an agent that was never configured', () => {
    expect(isTrustedBeacon({}, 'anything.example.com')).toBe(true)
  })

  test('keeps each agent\'s set separate', () => {
    const a = buildAgent({ beacon: 'a.example.com' })
    const b = buildAgent({ beacon: 'b.example.com' })
    trustBeacons(a)
    trustBeacons(b)

    expect(isTrustedBeacon(a, 'b.example.com')).toBe(false)
    expect(isTrustedBeacon(b, 'a.example.com')).toBe(false)
  })
})
