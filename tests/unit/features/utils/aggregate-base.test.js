import { faker } from '@faker-js/faker'
import { AggregateBase } from '../../../../src/features/utils/aggregate-base'
import { isValid } from '../../../../src/common/config/info'
import { configure } from '../../../../src/loaders/configure/configure'
import { gosCDN } from '../../../../src/common/window/nreum'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { EventBuffer } from '../../../../src/features/utils/event-buffer'
import { EventAggregator } from '../../../../src/common/aggregate/event-aggregator'
import { Aggregate as PVEAggregate } from '../../../../src/features/page_view_event/aggregate/index'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'
import { IDEAL_PAYLOAD_SIZE, MIN_EARLY_HARVEST_INTERVAL } from '../../../../src/common/constants/agent-constants'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/aggregate-base')
jest.unmock('../../../../src/features/utils/feature-base')
jest.unmock('../../../../src/common/event-emitter/contextual-ee')
jest.unmock('../../../../src/features/page_view_event/aggregate/index')
jest.unmock('../../../../src/features/utils/event-buffer')
jest.unmock('../../../../src/common/util/stringify')
jest.unmock('../../../../src/common/timing/now')

jest.mock('../../../../src/common/event-emitter/register-handler', () => ({
  __esModule: true,
  registerHandler: jest.fn()
}))
jest.mock('../../../../src/common/config/info', () => ({
  __esModule: true,
  isValid: jest.fn().mockReturnValue(false)
}))
jest.mock('../../../../src/loaders/configure/configure', () => ({
  __esModule: true,
  configure: jest.fn()
}))
jest.mock('../../../../src/common/window/nreum', () => ({
  __esModule: true,
  gosCDN: jest.fn().mockReturnValue({}),
  gosNREUM: jest.fn().mockReturnValue({})
}))
jest.mock('../../../../src/common/util/console', () => ({
  __esModule: true,
  warn: jest.fn()
}))

jest.mock('../../../../src/common/constants/runtime', () => ({
  ...jest.requireActual('../../../../src/common/constants/runtime'),
  isiOS: false,
  isBrowserScope: true,
  globalScope: {
    window: {
      parent: {}
    }
  }
}))

let agentIdentifier
let featureName
let mainAgent

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  featureName = faker.string.uuid()
  mainAgent = {
    agentIdentifier,
    ee: ee.get(agentIdentifier),
    runtime: { [faker.string.uuid()]: faker.lorem.sentence(), appMetadata: { agents: [{ entityGuid: '12345' }] } },
    // TODO CHECK THAT THIS STILL WORKS WITH NEW SYSTEM
    info: { licenseKey: faker.string.uuid(), applicationID: faker.string.uuid(), entityGuid: faker.string.uuid() }
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

test('should not perform late configuration checks in AggregateBase', () => {
  new AggregateBase(mainAgent, featureName)

  expect(isValid).not.toHaveBeenCalled()
  expect(gosCDN).not.toHaveBeenCalled()
  expect(configure).not.toHaveBeenCalled()
})

test('should resolve waitForFlags correctly based on flags with real vals', async () => {
  const flagNames = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()]
  const aggregateBase = new AggregateBase(mainAgent, featureName)
  const flagWait = aggregateBase.waitForFlags(flagNames)
  aggregateBase.ee.emit('rumresp', [{
    [flagNames[0]]: 0,
    [flagNames[1]]: 1,
    [flagNames[2]]: 2,
    'not-expected0': 0,
    'not-expected1': 1,
    'not-expected2': 2
  }])
  await expect(flagWait).resolves.toEqual([0, 1, 2])
})

test('should return empty array when flagNames is empty', async () => {
  const flagNames = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()]
  const aggregateBase = new AggregateBase(mainAgent, featureName)
  const flagWait = aggregateBase.waitForFlags()
  aggregateBase.ee.emit('rumresp', [{
    [flagNames[0]]: 0,
    [flagNames[1]]: 1,
    [flagNames[2]]: 2,
    'not-expected0': 0,
    'not-expected1': 1,
    'not-expected2': 2
  }])
  await expect(flagWait).resolves.toEqual([])
})

test('should return activatedFeatures values when available', async () => {
  mainAgent.agentIdentifier = 'abcd' // 'abcd' matches the af mock at the top of this file
  mainAgent.ee = ee.get('abcd') // Update ee to match the new agentIdentifier
  mainAgent.runtime.activatedFeatures = {
    abc: 0,
    def: 1,
    ghi: 2,
    'not-expected0': 0,
    'not-expected1': 1,
    'not-expected2': 2
  }
  const aggregateBase = new AggregateBase(mainAgent, featureName)
  const flagWait = aggregateBase.waitForFlags()
  await expect(flagWait).resolves.toEqual([])
})

test('handles events storage correctly across multiple features', async () => {
  const pveAgg = new PVEAggregate(mainAgent, FEATURE_NAMES.pageViewEvent)

  expect(pveAgg.events instanceof EventBuffer).toEqual(true)
  expect(mainAgent.sharedAggregator).toBeUndefined()

  /** event buffer users */
  const eventBufferAggs = [
    new AggregateBase(mainAgent, FEATURE_NAMES.pageViewTiming),
    new AggregateBase(mainAgent, FEATURE_NAMES.ajax),
    new AggregateBase(mainAgent, FEATURE_NAMES.genericEvents),
    new AggregateBase(mainAgent, FEATURE_NAMES.logging),
    new AggregateBase(mainAgent, FEATURE_NAMES.sessionTrace)
  ]
  eventBufferAggs.forEach(agg => {
    expect(agg.events instanceof EventBuffer).toEqual(true)
    expect(eventBufferAggs.filter(a => a !== agg).some(a => a.events === agg.events)).toEqual(false) // should not be the same instance as any other aggregator
  })

  /** event aggregator users */
  const eventAggregatorAggs = [new AggregateBase(mainAgent, FEATURE_NAMES.jserrors), new AggregateBase(mainAgent, FEATURE_NAMES.metrics)]
  expect(mainAgent.sharedAggregator instanceof EventAggregator).toEqual(true) // should be the same instance as the shared aggregator

  eventAggregatorAggs.forEach((agg, i) => {
    expect(agg.events instanceof EventAggregator).toEqual(true)
    expect(agg.events === mainAgent.sharedAggregator).toEqual(true) // should be the same instance as the shared aggregator
    expect(eventAggregatorAggs.filter(a => a !== agg).every(a => a.events === agg.events)).toEqual(true) // should share instance with all other event buffer aggregators
  })

  /** neither users */
  const neitherAggs = [new AggregateBase(mainAgent, FEATURE_NAMES.sessionReplay)]

  neitherAggs.forEach((agg, i) => {
    expect(agg.events === mainAgent.sharedAggregator).toEqual(false) // should not be the same instance as the shared aggregator
    expect(agg.events instanceof EventBuffer).toEqual(false) // should not be an event buffer
    expect(agg.events instanceof EventAggregator).toEqual(false) // should not be an event aggregator
  })
})

test('handles events storage correctly across multiple features - multiple agents', async () => {
  const agentIdentifier2 = faker.string.uuid()
  const mainAgent2 = {
    ...mainAgent,
    agentIdentifier: agentIdentifier2,
    ee: ee.get(agentIdentifier2),
    init: {
      [FEATURE_NAMES.pageViewEvent]: { autoStart: true }
    },
    runtime: { [faker.string.uuid()]: faker.lorem.sentence(), appMetadata: { agents: [{ entityGuid: '56789' }] } }
  }

  const pveAgg1 = new PVEAggregate(mainAgent, FEATURE_NAMES.pageViewEvent)
  const pveAgg2 = new PVEAggregate(mainAgent2, FEATURE_NAMES.pageViewEvent)

  expect(pveAgg1.events === pveAgg2.events).toEqual(false) // should not be the same instance

  /** event buffer users */
  const eventBufferAggs = [
    new AggregateBase(mainAgent, FEATURE_NAMES.pageViewTiming),
    new AggregateBase(mainAgent, FEATURE_NAMES.ajax),
    new AggregateBase(mainAgent, FEATURE_NAMES.genericEvents),
    new AggregateBase(mainAgent, FEATURE_NAMES.logging)
  ]
  const eventBuffer2Aggs = [
    new AggregateBase(mainAgent2, FEATURE_NAMES.pageViewTiming),
    new AggregateBase(mainAgent2, FEATURE_NAMES.ajax),
    new AggregateBase(mainAgent2, FEATURE_NAMES.genericEvents),
    new AggregateBase(mainAgent2, FEATURE_NAMES.logging)
  ]
  eventBufferAggs.forEach((agg, i) => {
    expect(agg.events === eventBuffer2Aggs[i].events).toEqual(false) // should not be the same instance
  })

  /** event aggregator users */
  const eventAggregatorAggs = [new AggregateBase(mainAgent, FEATURE_NAMES.jserrors), new AggregateBase(mainAgent, FEATURE_NAMES.metrics)]
  const eventAggregator2Aggs = [new AggregateBase(mainAgent2, FEATURE_NAMES.jserrors), new AggregateBase(mainAgent2, FEATURE_NAMES.metrics)]
  expect(mainAgent.sharedAggregator instanceof EventAggregator).toEqual(true) // should be the same instance as the shared aggregator
  expect(mainAgent2.sharedAggregator instanceof EventAggregator).toEqual(true) // should be the same instance as the shared aggregator

  eventAggregatorAggs.forEach((agg, i) => {
    expect(agg.events === eventAggregator2Aggs[i].events).toEqual(false) // should not be the same instance
  })
})

describe('decideEarlyHarvest', () => {
  let aggregate
  let nowMs

  const bigEvent = () => 'x'.repeat(IDEAL_PAYLOAD_SIZE + 1)

  beforeEach(() => {
    nowMs = 0
    jest.spyOn(performance, 'now').mockImplementation(() => nowMs)
    mainAgent.runtime.harvester = { triggerHarvestFor: jest.fn() }
    mainAgent.runtime.jsAttributesMetadata = { bytes: 0 }
    aggregate = new AggregateBase(mainAgent, FEATURE_NAMES.logging)
    jest.spyOn(aggregate, 'reportSupportabilityMetric').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('does not harvest when below the ideal payload size', () => {
    aggregate.events.add('small')
    expect(mainAgent.runtime.harvester.triggerHarvestFor).not.toHaveBeenCalled()
    expect(aggregate.lastEarlyHarvestAt).toBeUndefined()
  })

  test('harvests early on the first oversized add, even right at page start', () => {
    nowMs = 3
    aggregate.events.add(bigEvent())
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(aggregate)
    expect(aggregate.reportSupportabilityMetric).toHaveBeenCalledWith(`${FEATURE_NAMES.logging}/Harvest/Early/Seen`, expect.any(Number))
  })

  test('suppresses further early harvests inside the minimum interval', () => {
    aggregate.events.add(bigEvent())
    nowMs = MIN_EARLY_HARVEST_INTERVAL - 1
    aggregate.events.add(bigEvent())
    aggregate.events.add(bigEvent())
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)
    expect(aggregate.reportSupportabilityMetric).toHaveBeenCalledTimes(1)
  })

  test('never drops suppressed data; it stays buffered for the next harvest', () => {
    aggregate.events.add(bigEvent()) // harvester is mocked, so nothing clears the buffer
    nowMs = 1
    aggregate.events.add('second')
    aggregate.events.add('third')
    expect(aggregate.events.length).toBe(3)
    expect(aggregate.events.get()).toEqual([expect.any(String), 'second', 'third'])
  })

  test('harvests early again once the minimum interval has elapsed', () => {
    aggregate.events.add(bigEvent())
    nowMs = MIN_EARLY_HARVEST_INTERVAL
    aggregate.events.add('another')
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(2)
    expect(aggregate.lastEarlyHarvestAt).toBe(MIN_EARLY_HARVEST_INTERVAL)
  })

  test('a suppressed attempt does not extend the window', () => {
    aggregate.events.add(bigEvent())
    nowMs = MIN_EARLY_HARVEST_INTERVAL - 1
    aggregate.events.add('suppressed')
    expect(aggregate.lastEarlyHarvestAt).toBe(0)
    nowMs = MIN_EARLY_HARVEST_INTERVAL
    aggregate.events.add('allowed')
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(2)
  })

  test('limits a flood to one early harvest per interval', () => {
    aggregate.events.add(bigEvent()) // the harvester is mocked, so the buffer stays over the ideal size for the rest of the test
    for (let i = 1; i < 1000; i++) {
      nowMs = i // 1 event per ms for 1000ms
      aggregate.events.add('x')
    }
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(2) // at 0ms and 500ms
    expect(aggregate.events.length).toBe(1000) // nothing was dropped
  })

  test('early harvest tracking is independent per feature instance', () => {
    const other = new AggregateBase(mainAgent, FEATURE_NAMES.genericEvents)
    jest.spyOn(other, 'reportSupportabilityMetric').mockImplementation(() => {})
    aggregate.events.add(bigEvent())
    other.events.add(bigEvent())
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(2)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(aggregate)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledWith(other)
  })

  test('counts separate custom attribute bytes toward the estimate', () => {
    aggregate.customAttributesAreSeparate = true
    mainAgent.runtime.jsAttributesMetadata.bytes = IDEAL_PAYLOAD_SIZE
    aggregate.events.add('tiny')
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)
  })

  test.each([
    ['blocked', (inst) => { inst.blocked = true }],
    ['retrying', (inst) => { inst.isRetrying = true }],
    ['unable to harvest early', (inst) => { inst.canHarvestEarly = false }]
  ])('does not harvest or start the window when %s', (_, setup) => {
    setup(aggregate)
    aggregate.events.add(bigEvent())
    expect(mainAgent.runtime.harvester.triggerHarvestFor).not.toHaveBeenCalled()
    expect(aggregate.lastEarlyHarvestAt).toBeUndefined()
  })
})
