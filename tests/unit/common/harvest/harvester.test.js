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

describe('FAILING: baseQueryString URL capture behavior', () => {
  let mockSubmit
  let agentRefWithBeacon

  beforeEach(() => {
    mockSubmit = jest.fn(() => ({ addEventListener: jest.fn() }))
    agentRefWithBeacon = {
      init: {
        harvest: { interval: 1 },
        ssl: true,
        proxy: {}
      },
      info: {
        errorBeacon: 'bam.nr-data.net',
        applicationID: 'test-app-id',
        licenseKey: 'test-license-key'
      },
      runtime: {
        obfuscator: {
          obfuscateString: jest.fn(url => url) // Just return the URL as-is for testing
        },
        session: {
          state: {
            value: 'test-session-id'
          }
        },
        maxBytes: 1000000
      },
      ee: {
        on: jest.fn()
      }
    }

    // Mock the globalScope.location
    delete global.window.location
    global.window.location = {
      href: 'https://example.com/original-page',
      toString: () => 'https://example.com/original-page'
    }
  })

  test('FAILING: should capture original page URL not current URL after soft navigation', () => {
    const { send } = require('../../../../src/common/harvest/harvester')

    // Initial page load at /original-page
    const initialUrl = 'https://example.com/original-page'
    global.window.location.href = initialUrl
    global.window.location.toString = () => initialUrl

    // Simulate a soft navigation (SPA route change)
    const newUrl = 'https://example.com/new-page'
    global.window.location.href = newUrl
    global.window.location.toString = () => newUrl

    // Now send a harvest - this should use the ORIGINAL URL, not the current one
    const result = send(agentRefWithBeacon, {
      endpoint: 'jserrors',
      targetApp: 'test-app',
      payload: { body: { test: 'data' } },
      localOpts: {},
      submitMethod: mockSubmit
    })

    expect(result).toBe(true)
    expect(mockSubmit).toHaveBeenCalled()

    const callArgs = mockSubmit.mock.calls[0][0]
    const sentUrl = callArgs.url

    // This assertion will FAIL because the harvester uses globalScope.location at send time
    // It should have sent the original URL but it sends the current URL
    expect(sentUrl).toContain('ref=https://example.com/original-page')
    // But it actually contains the NEW URL:
    // expect(sentUrl).toContain('ref=https://example.com/new-page')
  })

  test('FAILING: demonstrates URL is captured at harvest time, not page load time', () => {
    const { send } = require('../../../../src/common/harvest/harvester')

    // Simulate the real-world scenario from the investigation:
    // 1. Page loads at /slots with FCP of 1200ms
    global.window.location.href = 'https://example.com/groceries/en-GB/slots'
    global.window.location.toString = () => 'https://example.com/groceries/en-GB/slots'

    // 2. User navigates to /shop via SPA (soft navigation happens at 15 seconds)
    global.window.location.href = 'https://example.com/groceries/en-GB/shop'
    global.window.location.toString = () => 'https://example.com/groceries/en-GB/shop'

    // 3. At 30 seconds, harvest happens and sends FCP from /slots
    //    But URL is captured NOW (at harvest time), which is /shop
    send(agentRefWithBeacon, {
      endpoint: 'jserrors',
      targetApp: 'test-app',
      payload: { body: { fcp: 1200 } }, // FCP from slots page
      localOpts: {},
      submitMethod: mockSubmit
    })

    const callArgs = mockSubmit.mock.calls[0][0]
    const sentUrl = callArgs.url

    // This assertion will FAIL - we expect slots page URL but get shop page URL
    // The FCP metric from /slots gets mis-attributed to /shop
    expect(sentUrl).toContain('ref=https://example.com/groceries/en-GB/slots')
    // But it actually sends:
    // expect(sentUrl).toContain('ref=https://example.com/groceries/en-GB/shop')
  })
})
