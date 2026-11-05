/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { send } from '../../../../src/common/harvest/send'
import { trustBeacons } from '../../../../src/common/config/trusted-beacons'
import { warn } from '../../../../src/common/util/console'
import { handle } from '../../../../src/common/event-emitter/handle'

jest.mock('../../../../src/common/util/console', () => ({ warn: jest.fn() }))
jest.mock('../../../../src/common/event-emitter/handle', () => ({ handle: jest.fn() }))

const buildAgent = (proxy = {}) => {
  const agent = {
    info: { beacon: 'bam.nr-data.net', errorBeacon: 'bam.nr-data.net', licenseKey: 'abc', applicationID: '1', jsAttributes: {} },
    init: { proxy },
    runtime: { maxBytes: 30000 },
    ee: { emit: jest.fn() }
  }
  trustBeacons(agent)
  return agent
}

const spec = (overrides = {}) => ({
  endpoint: 'events',
  payload: { body: { e: 1 } },
  submitMethod: jest.fn(),
  cbFinished: jest.fn(),
  ...overrides
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('send locked config reporting', () => {
  test('reports a write to locked config as a supportability metric on the next send', () => {
    const agent = buildAgent()
    agent.info.licenseKey = 'evil'

    send(agent, spec())

    expect(handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Config/Locked/info.licenseKey/Changed'], undefined, 'metrics', agent.ee)
  })

  test('reports each write once', () => {
    const agent = buildAgent()
    agent.info.licenseKey = 'evil'

    send(agent, spec())
    send(agent, spec())

    expect(handle).toHaveBeenCalledTimes(1)
  })

  test('does not report anything when no locked config was written', () => {
    send(buildAgent(), spec())

    expect(handle).not.toHaveBeenCalled()
  })
})

describe('send destination', () => {
  test('sends to the configured errorBeacon', () => {
    const agent = buildAgent()
    const s = spec()

    expect(send(agent, s)).toBe(true)
    expect(s.submitMethod).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/^https:\/\/bam\.nr-data\.net\/events\//) }))
  })

  test('sends to the configured proxy beacon', () => {
    const agent = buildAgent({ beacon: 'proxy.example.com/nr' })
    const s = spec()

    expect(send(agent, s)).toBe(true)
    expect(s.submitMethod).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/^https:\/\/proxy\.example\.com\/nr\/events\//) }))
  })

  test('does not send when the proxy beacon is changed after configuration', () => {
    const agent = buildAgent()
    agent.init = { proxy: { beacon: 'evil.example.com' } } // replaces the (frozen) proxy object wholesale
    const s = spec()

    expect(send(agent, s)).toBe(false)
    expect(s.submitMethod).not.toHaveBeenCalled()
    expect(s.cbFinished).toHaveBeenCalledWith({ sent: false })
  })

  test('does not send when info is replaced with a different errorBeacon', () => {
    const agent = buildAgent()
    agent.info = { ...agent.info, errorBeacon: 'evil.example.com' }
    const s = spec()

    expect(send(agent, s)).toBe(false)
    expect(s.submitMethod).not.toHaveBeenCalled()
  })

  test('does not send raw requests to a changed destination', () => {
    const agent = buildAgent()
    agent.info = { ...agent.info, errorBeacon: 'evil.example.com' }
    const s = spec({ raw: true })

    expect(send(agent, s)).toBe(false)
    expect(s.submitMethod).not.toHaveBeenCalled()
  })

  test('warns about a blocked destination only once', async () => {
    jest.resetModules()
    const { send: freshSend } = await import('../../../../src/common/harvest/send')
    const { trustBeacons: freshTrust } = await import('../../../../src/common/config/trusted-beacons')
    const { warn: freshWarn } = await import('../../../../src/common/util/console')
    const agent = buildAgent()
    agent.info = { ...agent.info }
    agent.init = { ...agent.init, proxy: { ...agent.init.proxy } }
    freshTrust(agent)
    agent.info = { ...agent.info, errorBeacon: 'evil.example.com' }

    freshSend(agent, spec())
    freshSend(agent, spec())

    expect(freshWarn).toHaveBeenCalledTimes(1)
    expect(freshWarn).toHaveBeenCalledWith(83)
  })

  test('does not warn when the destination is the configured one', () => {
    send(buildAgent(), spec())

    expect(warn).not.toHaveBeenCalledWith(83)
  })
})
