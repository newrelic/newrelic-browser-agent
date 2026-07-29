import { Aggregate } from '../../../../../src/features/page_view_event/aggregate'

function buildInstance (agentRef) {
  const instance = Object.create(Aggregate.prototype)
  instance.agentRef = agentRef
  instance.ee = agentRef.ee
  instance.featureName = 'page_view_event'
  instance.harvestOpts = {}
  instance.events = { clearSave: jest.fn(), reloadSave: jest.fn() }
  instance.rumStartTime = 123
  instance.drain = jest.fn()
  return instance
}

function buildAgent (observationModeEnabled) {
  return {
    ee: { emit: jest.fn(), abort: jest.fn() },
    init: { observation_mode: { enabled: observationModeEnabled } },
    runtime: {
      appMetadata: {},
      activatedFeatures: undefined,
      timeKeeper: { processRumRequest: jest.fn(), ready: true },
      harvester: { startTimer: jest.fn() }
    }
  }
}

describe('postHarvestCleanup', () => {
  describe('observation_mode enabled', () => {
    let agentRef, instance

    beforeEach(() => {
      agentRef = buildAgent(true)
      instance = buildInstance(agentRef)
    })

    test('activates features with a fully-entitled synthetic response, without a real network response', () => {
      instance.postHarvestCleanup() // no XHR result exists in observation_mode -- sent/status/responseText/xhr/retry are all undefined

      expect(agentRef.runtime.activatedFeatures).toMatchObject({
        loaded: 1, st: 1, err: 1, ins: 1, spa: 1, sr: 1, sts: 1, srs: 1, log: 1, logapi: 1
      })
    })

    test('sets appMetadata from the synthetic response when none is already set', () => {
      instance.postHarvestCleanup()

      expect(agentRef.runtime.appMetadata).toEqual({
        agents: [{ entityGuid: undefined }],
        nrServerTime: expect.any(Number)
      })
    })

    test('does not overwrite appMetadata if it is already populated', () => {
      agentRef.runtime.appMetadata = { agents: [{ entityGuid: 'real-guid' }] }

      instance.postHarvestCleanup()

      expect(agentRef.runtime.appMetadata).toEqual({ agents: [{ entityGuid: 'real-guid' }] })
    })

    test('feeds a synthetic nrServerTime into the timeKeeper instead of waiting on a real response', () => {
      instance.postHarvestCleanup()

      expect(agentRef.runtime.timeKeeper.processRumRequest).toHaveBeenCalledTimes(1)
      const [rumRequest, startTime, endTime, nrServerTime] = agentRef.runtime.timeKeeper.processRumRequest.mock.calls[0]
      expect(rumRequest).toBeNull()
      expect(startTime).toEqual(123)
      expect(typeof endTime).toEqual('number')
      expect(typeof nrServerTime).toEqual('number')
    })

    test('drains the feature and starts the harvest timer', () => {
      instance.postHarvestCleanup()

      expect(instance.drain).toHaveBeenCalledTimes(1)
      expect(agentRef.runtime.harvester.startTimer).toHaveBeenCalledTimes(1)
    })

    test('cleans up the event buffer without retrying, since nothing was actually sent', () => {
      instance.postHarvestCleanup()

      expect(instance.events.clearSave).toHaveBeenCalledTimes(1)
      expect(instance.events.reloadSave).not.toHaveBeenCalled()
    })

    test('still activates even if the timeKeeper throws', () => {
      agentRef.runtime.timeKeeper.processRumRequest.mockImplementation(() => { throw new Error('boom') })

      expect(() => instance.postHarvestCleanup()).not.toThrow()
      expect(agentRef.runtime.activatedFeatures).toBeTruthy()
      expect(instance.drain).toHaveBeenCalledTimes(1)
    })
  })

  describe('observation_mode disabled', () => {
    test('parses the real response instead of synthesizing one', () => {
      const agentRef = buildAgent(false)
      const instance = buildInstance(agentRef)

      instance.postHarvestCleanup({
        sent: true,
        status: 200,
        responseText: JSON.stringify({ err: 1, ins: 0, app: { agents: [{ entityGuid: 'real-guid' }], nrServerTime: 111 } }),
        retry: false
      })

      expect(agentRef.runtime.activatedFeatures).toMatchObject({ err: 1, ins: 0 })
      expect(agentRef.runtime.appMetadata).toEqual({ agents: [{ entityGuid: 'real-guid' }], nrServerTime: 111 })
    })
  })
})
