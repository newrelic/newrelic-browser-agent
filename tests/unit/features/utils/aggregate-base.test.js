import { faker } from '@faker-js/faker'
import { AggregateBase } from '../../../../src/features/utils/aggregate-base'
import { isValid } from '../../../../src/common/config/info'
import { configure } from '../../../../src/loaders/configure/configure'
import { gosCDN } from '../../../../src/common/window/nreum'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { EventBuffer } from '../../../../src/features/utils/event-buffer'
import { EventAggregator } from '../../../../src/common/aggregate/event-aggregator'
import { Aggregate as PVEAggregate } from '../../../../src/features/page_view_event/aggregate/index'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/aggregate-base')
jest.unmock('../../../../src/features/utils/feature-base')
jest.unmock('../../../../src/common/event-emitter/contextual-ee')
jest.unmock('../../../../src/features/page_view_event/aggregate/index')

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
jest.mock('../../../../src/common/util/feature-flags', () => ({
  __esModule: true,
  activatedFeatures: {
    abcd: {
      abc: 0,
      def: 1,
      ghi: 2,
      'not-expected0': 0,
      'not-expected1': 1,
      'not-expected2': 2
    }
  }
}))

jest.mock('../../../../src/common/constants/runtime', () => ({
  ...jest.requireActual('../../../../src/common/constants/runtime'),
  supportsNavTimingL2: () => true,
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
    runtime: { [faker.string.uuid()]: faker.lorem.sentence(), appMetadata: { agents: [{ entityGuid: '12345' }] } },
    // TODO CHECK THAT THIS STILL WORKS WITH NEW SYSTEM
    info: { licenseKey: faker.string.uuid(), applicationID: faker.string.uuid(), entityGuid: faker.string.uuid() }
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

test('should merge info, jsattributes, and runtime objects', () => {
  const mockInfo1 = {
    [faker.string.uuid()]: faker.lorem.sentence(),
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    },
    licenseKey: faker.string.uuid(),
    applicationID: faker.string.uuid()
  }
  jest.mocked(gosCDN).mockReturnValue({ info: mockInfo1 })

  const mockInfo2 = {
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }
  mainAgent.info = mockInfo2

  new AggregateBase(mainAgent, featureName)

  expect(isValid).toHaveBeenCalledWith(mockInfo2)
  expect(gosCDN).toHaveBeenCalledTimes(1)
  expect(configure).toHaveBeenCalledWith(mainAgent, {
    info: {
      ...mockInfo1,
      jsAttributes: {
        ...mockInfo1.jsAttributes,
        ...mockInfo2.jsAttributes
      }
    },
    runtime: mainAgent.runtime
  }, mainAgent.runtime.loaderType)
})

test('should only configure the agent once', () => {
  jest.mocked(isValid).mockReturnValue(true)

  new AggregateBase(mainAgent, featureName)

  expect(isValid).toHaveBeenCalledWith(mainAgent.info)
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
  const mainAgent2 = {
    ...mainAgent,
    agentIdentifier: faker.string.uuid(),
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
