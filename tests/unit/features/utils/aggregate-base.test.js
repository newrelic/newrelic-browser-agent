import { faker } from '@faker-js/faker'
import { AggregateBase } from '../../../../src/features/utils/aggregate-base'
import { isValid } from '../../../../src/common/config/info'
import { configure } from '../../../../src/loaders/configure/configure'
import { gosCDN } from '../../../../src/common/window/nreum'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { EventStoreManager } from '../../../../src/features/utils/event-store-manager'
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

test('does not initialized Aggregator more than once with multiple features', async () => {
  expect(EventStoreManager).toHaveBeenCalledTimes(0)
  expect(mainAgent.runtime.entityManager).toBeUndefined()

  const pveAgg = new PVEAggregate(mainAgent, FEATURE_NAMES.pageViewEvent)

  const mockRumResp1 = { app: { agents: [{ entityGuid: '12345' }] } }
  pveAgg.processEntities(mockRumResp1.app.agents, { licenseKey: '1', applicationID: '1' })

  expect(EventStoreManager).toHaveBeenCalledTimes(1)
  expect(EventStoreManager).toHaveBeenCalledWith(mainAgent, EventBuffer, '12345', pveAgg) // 2 = initialize EventAggregator
  expect(mainAgent.runtime.entityManager).toBeTruthy()
  expect(mainAgent.sharedAggregator).toBeUndefined()

  new AggregateBase(mainAgent, FEATURE_NAMES.jserrors) // this feature should be using the shared aggregator, so it will set it now
  expect(EventStoreManager).toHaveBeenCalledTimes(2)
  expect(EventStoreManager).toHaveBeenCalledWith(mainAgent, EventAggregator, '12345', { featureName: 'shared_aggregator' }) // 2 = initialize EventAggregator
  expect(mainAgent.sharedAggregator).toBeTruthy()

  const pvtAgg = new AggregateBase(mainAgent, FEATURE_NAMES.pageViewTiming) // PVT should use its own EventStoreManager
  expect(EventStoreManager).toHaveBeenCalledTimes(3)
  expect(EventStoreManager).toHaveBeenCalledWith(mainAgent, EventBuffer, '12345', pvtAgg) // 1 = initialize EventBuffer
})

test('does initialize separate Aggregators with multiple agents', async () => {
  const mainAgent2 = {
    ...mainAgent,
    agentIdentifier: faker.string.uuid(),
    init: {
      [FEATURE_NAMES.pageViewEvent]: { autoStart: true }
    },
    runtime: { [faker.string.uuid()]: faker.lorem.sentence(), appMetadata: { agents: [{ entityGuid: '56789' }] } }

  }
  expect(EventStoreManager).toHaveBeenCalledTimes(0)

  const pveAgg1 = new PVEAggregate(mainAgent, FEATURE_NAMES.pageViewEvent)
  const pveAgg2 = new PVEAggregate(mainAgent2, FEATURE_NAMES.pageViewEvent)

  const mockRumResp1 = { app: { agents: [{ entityGuid: '12345' }] } }
  const mockRumResp2 = { app: { agents: [{ entityGuid: '56789' }] } }
  pveAgg1.processEntities(mockRumResp1.app.agents, { licenseKey: '1', applicationID: '1' })
  pveAgg2.processEntities(mockRumResp2.app.agents, { licenseKey: '2', applicationID: '2' })

  expect(EventStoreManager).toHaveBeenCalledTimes(2) // event buffer x 2
  expect(EventStoreManager).not.toHaveBeenCalledWith(expect.any(Object), EventAggregator, '12345')

  new AggregateBase(mainAgent, FEATURE_NAMES.jserrors)
  new AggregateBase(mainAgent2, FEATURE_NAMES.jserrors)
  expect(EventStoreManager).toHaveBeenCalledTimes(4) // event buffer x 2, event aggregator x 2

  new AggregateBase(mainAgent, FEATURE_NAMES.metrics)
  new AggregateBase(mainAgent2, FEATURE_NAMES.metrics)
  expect(EventStoreManager).toHaveBeenCalledTimes(4) // should not initialize another since jserrors set up the shared instance
})
