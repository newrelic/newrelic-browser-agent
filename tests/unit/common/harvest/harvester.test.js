import { Harvester } from '../../../../src/common/harvest/harvester'

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
  expect(fakeAgent.ee.on).toHaveBeenCalledTimes(1)
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

describe('triggerHarvestFor', () => {
  const harvester = new Harvester(fakeAgent)
  test('fails if aggregate is blocked', () => {
    expect(harvester.triggerHarvestFor({ blocked: true })).toEqual(false)
  })
  test('does nothing if no payload is returned from makeHarvestPayload if directSend unspecified', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn() }
    expect(harvester.triggerHarvestFor(fakeAggregate, { directSend: undefined })).toEqual(false)
    expect(fakeAggregate.makeHarvestPayload).toHaveBeenCalledTimes(1)
  })
  test('allows directSend to provide the payload without makeHarvestPayload', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn(), harvestOpts: {} }
    expect(harvester.triggerHarvestFor(fakeAggregate, { directSend: { targetApp: 'someApp', payload: 'fakePayload' } })).toEqual(true)
    expect(fakeAggregate.makeHarvestPayload).not.toHaveBeenCalled()
  })
  test('disallow directSend to send if no payload is defined', () => {
    expect(harvester.triggerHarvestFor({}, { directSend: { targetApp: 'someApp', payload: undefined } })).toEqual(false)
  })
  test('sends if payload is returned from makeHarvestPayload', () => {
    const fakeAggregate = { makeHarvestPayload: jest.fn().mockReturnValue([{ targetApp: 'someApp', payload: 'fakePayload' }]), harvestOpts: {} }
    expect(harvester.triggerHarvestFor(fakeAggregate, { })).toEqual(true)
  })
  test('sends if makeHarvestPayload returns payload for at least one app', () => {
    const fakeAggregate = {
      makeHarvestPayload: jest.fn().mockReturnValue([
        { targetApp: 'someApp1', payload: undefined },
        { targetApp: 'someApp2', payload: 'fakePayload' }
      ]),
      harvestOpts: {}
    }
    expect(harvester.triggerHarvestFor(fakeAggregate, { })).toEqual(true)
  })
})
