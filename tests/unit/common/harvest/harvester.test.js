import { Harvester, send } from '../../../../src/common/harvest/harvester'

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
  })
  let harvester
  beforeEach(() => {
    harvester = new Harvester(fakeAgent)
  })
  afterEach(() => {
    jest.clearAllMocks()
    fakeAgent.runtime.registeredEntities = []
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
})
