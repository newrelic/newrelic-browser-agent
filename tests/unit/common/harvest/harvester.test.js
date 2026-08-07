import { Harvester } from '../../../../src/common/harvest/harvester'
import { send } from '../../../../src/common/harvest/send'

let mockEolCb
jest.mock('../../../../src/common/unload/eol', () => ({
  subscribeToEOL: jest.fn(cb => { mockEolCb = cb })
}))

const fakeAgent = {
  init: {
    harvest: { interval: 1 }
  },
  info: {}, // not having an errorBeacon value lets us skip the internal send() call, making testing easier
  ee: {
    on: jest.fn()
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEolCb = undefined
})

test('Harvester does not start timer loop on initialization', () => {
  jest.spyOn(global, 'setTimeout')

  const harvester = new Harvester(fakeAgent)
  expect(mockEolCb).not.toBeUndefined()
  expect(harvester.agentRef).toEqual(fakeAgent)
  expect(global.setTimeout).not.toHaveBeenCalled()
})

test('Harvest loop can only be started once', () => {
  jest.spyOn(global, 'setTimeout')

  const harvester = new Harvester(fakeAgent)
  harvester.startTimer()
  expect(global.setTimeout).toHaveBeenCalledTimes(1)
  harvester.startTimer()
  expect(global.setTimeout).toHaveBeenCalledTimes(1)
})

test('On harvest interval, triggerHarvest runs for every aggregate', () => {
  jest.spyOn(global, 'setTimeout')
  const harvester = new Harvester(fakeAgent)
  harvester.triggerHarvestFor = jest.fn()
  harvester.startTimer()

  harvester.initializedAggregates.push({}, {}, {}) // fake aggregates
  global.setTimeout.mock.calls[0][0]()
  expect(harvester.triggerHarvestFor).toHaveBeenCalledTimes(3)
  expect(global.setTimeout).toHaveBeenCalledTimes(2) // it also scheduled the next interval
})

describe('On EOL harvest', () => {
  test('triggerHarvestFor runs for every aggregate', () => {
    const harvester = new Harvester(fakeAgent)
    harvester.triggerHarvestFor = jest.fn()

    expect(harvester.initializedAggregates.length).toEqual(0)
    harvester.initializedAggregates.push({ harvestOpts: {} }, { harvestOpts: {} })
    mockEolCb()
    expect(harvester.triggerHarvestFor).toHaveBeenCalledTimes(2)
    expect(harvester.triggerHarvestFor).toHaveBeenLastCalledWith(expect.any(Object), { isFinalHarvest: true })
  })

  test('all aggregates beforeUnload provided are called prior to triggering harvest', () => {
    const harvester = new Harvester(fakeAgent)
    harvester.triggerHarvestFor = jest.fn(() => performance.now())

    const secondBeforeUnload = jest.fn(() => performance.now())
    harvester.initializedAggregates.push({ harvestOpts: { } }, { harvestOpts: { beforeUnload: secondBeforeUnload } })
    mockEolCb()
    expect(harvester.triggerHarvestFor).toHaveBeenCalledTimes(2)
    expect(secondBeforeUnload).toHaveBeenCalledTimes(1)

    const secondAggregateBeforeUnloadRun = secondBeforeUnload.mock.results[0].value
    const firstAggregateFinalHarvestRun = harvester.triggerHarvestFor.mock.results[0].value
    const secondAggregateFinalHarvestRun = harvester.triggerHarvestFor.mock.results[1].value
    expect(firstAggregateFinalHarvestRun).toBeLessThan(secondAggregateFinalHarvestRun) // the aggregates are harvested in add-order
    expect(secondAggregateBeforeUnloadRun).toBeLessThan(firstAggregateFinalHarvestRun) // but even the latest beforeUnload runs prior any final harvest
  })
})

describe('send', () => {
  beforeAll(() => {
    fakeAgent.info.errorBeacon = 'test'
    fakeAgent.init.proxy = {}
    fakeAgent.runtime = { obfuscator: { obfuscateString: jest.fn() } }
  })
  afterAll(() => {
    delete fakeAgent.info.errorBeacon
  })

  test('does not send if cleaned payload is null', () => {
    expect(send(fakeAgent, { endpoint: 'someEndpoint', targetApp: 'someApp', payload: { body: null }, localOpts: {} })).toEqual(false)
  })
  test('does not send if cleaned payload is empty string', () => {
    expect(send(fakeAgent, { endpoint: 'someEndpoint', targetApp: 'someApp', payload: { body: '' }, localOpts: {} })).toEqual(false)
  })
  test('does send if cleaned payload is string', () => {
    expect(send(fakeAgent, { endpoint: 'someEndpoint', targetApp: 'someApp', payload: { body: 'valid string' }, localOpts: {}, submitMethod: jest.fn() })).toEqual(true)
  })
  test('does send if cleaned payload is object', () => {
    expect(send(fakeAgent, { endpoint: 'someEndpoint', targetApp: 'someApp', payload: { body: { key: 'value' } }, localOpts: {}, submitMethod: jest.fn() })).toEqual(true)
  })
  test('does send if sendEmptyBody', () => {
    expect(send(fakeAgent, { endpoint: 'someEndpoint', targetApp: 'someApp', payload: { body: '' }, localOpts: { sendEmptyBody: true }, submitMethod: jest.fn() })).toEqual(true)
  })
})

describe('triggerHarvestFor', () => {
  beforeAll(() => {
    fakeAgent.runtime = {
      registeredEntities: []
    }
    fakeAgent.init.observation_mode = { enabled: false }
  })
  let harvester
  beforeEach(() => {
    harvester = new Harvester(fakeAgent)
  })
  afterEach(() => {
    jest.clearAllMocks()
    fakeAgent.runtime.registeredEntities = []
    delete fakeAgent.runtime.beforeHarvest
    fakeAgent.init.observation_mode.enabled = false
  })
  test('fails if aggregate is blocked', () => {
    expect(harvester.triggerHarvestFor({ blocked: true })).toEqual({ payload: undefined, ranSend: false, endpointVersion: 1 })
  })
  test('does nothing if no payload is returned from makeHarvestPayload (without sendEmptyBody)', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn(), agentRef: fakeAgent }
    expect(harvester.triggerHarvestFor(fakeAggregate)).toEqual({ payload: undefined, ranSend: false, endpointVersion: 1 })
    expect(fakeAggregate.makeHarvestPayload).toHaveBeenCalledTimes(1)
  })
  test('sends if payload is returned from makeHarvestPayload', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent }
    expect(harvester.triggerHarvestFor(fakeAggregate, { })).toEqual({ payload: 'fakePayload', ranSend: true, endpointVersion: 1 })
  })
  test('uses aggregate harvest endpoint version for harvests - v1', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, featureName: 'jserrors', harvestEndpointVersion: 1 }
    expect(harvester.triggerHarvestFor(fakeAggregate, { })).toEqual({ payload: 'fakePayload', ranSend: true, endpointVersion: 1 })
  })

  test('uses aggregate harvest endpoint version for harvests - v2', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, featureName: 'jserrors', harvestEndpointVersion: 2 }
    expect(harvester.triggerHarvestFor(fakeAggregate, { })).toEqual({ payload: 'fakePayload', ranSend: true, endpointVersion: 2 })
  })

  describe('beforeHarvest hook', () => {
    test('is invoked with the feature name and harvest payload so the payload can be inspected', () => {
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, featureName: 'jserrors' }
      fakeAgent.runtime.beforeHarvest = jest.fn()

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(fakeAgent.runtime.beforeHarvest).toHaveBeenCalledTimes(1)
      expect(fakeAgent.runtime.beforeHarvest).toHaveBeenCalledWith({ feature: 'jserrors', payload: 'fakePayload' })
      expect(result).toEqual({ payload: 'fakePayload', ranSend: true, endpointVersion: 1 }) // returning undefined sends the original payload
    })

    test('modifies the payload that gets sent when it returns a value', () => {
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent }
      fakeAgent.runtime.beforeHarvest = jest.fn().mockReturnValue('modifiedPayload')

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(result).toEqual({ payload: 'modifiedPayload', ranSend: true, endpointVersion: 1 })
    })

    test('cancels the harvest without sending or retrying when it returns null', () => {
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, postHarvestCleanup: jest.fn() }
      fakeAgent.runtime.beforeHarvest = jest.fn().mockReturnValue(null)

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(result).toEqual({ payload: undefined, ranSend: false, endpointVersion: 1 })
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledTimes(1)
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledWith({ sent: false })
    })

    test('is not required to be defined', () => {
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent }
      expect(fakeAgent.runtime.beforeHarvest).toBeUndefined()

      expect(() => harvester.triggerHarvestFor(fakeAggregate)).not.toThrow()
    })
  })

  describe('observation_mode', () => {
    test('does not send but still runs cleanup and the beforeHarvest hook when enabled', () => {
      fakeAgent.init.observation_mode.enabled = true
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, postHarvestCleanup: jest.fn(), featureName: 'jserrors' }
      fakeAgent.runtime.beforeHarvest = jest.fn()

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(fakeAgent.runtime.beforeHarvest).toHaveBeenCalledWith({ feature: 'jserrors', payload: 'fakePayload' }) // hook can still inspect data even though nothing is sent
      expect(result).toEqual({ payload: 'fakePayload', ranSend: false, endpointVersion: 1 })
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledTimes(1)
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledWith({ sent: false })
    })

    test('sends normally when disabled', () => {
      fakeAgent.init.observation_mode.enabled = false
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent }

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(result).toEqual({ payload: 'fakePayload', ranSend: true, endpointVersion: 1 })
    })

    test('a beforeHarvest cancellation short-circuits before the observation_mode check runs', () => {
      fakeAgent.init.observation_mode.enabled = true
      const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue('fakePayload'), harvestOpts: {}, agentRef: fakeAgent, postHarvestCleanup: jest.fn() }
      fakeAgent.runtime.beforeHarvest = jest.fn().mockReturnValue(null)

      const result = harvester.triggerHarvestFor(fakeAggregate)

      expect(result).toEqual({ payload: undefined, ranSend: false, endpointVersion: 1 })
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledTimes(1) // cleanup runs exactly once, not once per branch
      expect(fakeAggregate.postHarvestCleanup).toHaveBeenCalledWith({ sent: false })
    })
  })
})
