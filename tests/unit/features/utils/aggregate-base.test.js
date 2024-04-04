import { faker } from '@faker-js/faker'
import { AggregateBase } from '../../../../src/features/utils/aggregate-base'
import { getInfo, isConfigured, getRuntime } from '../../../../src/common/config/config'
import { configure } from '../../../../src/loaders/configure/configure'
import { gosCDN } from '../../../../src/common/window/nreum'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/aggregate-base')
jest.unmock('../../../../src/features/utils/feature-base')
jest.unmock('../../../../src/common/event-emitter/contextual-ee')

jest.mock('../../../../src/common/event-emitter/register-handler', () => ({
  __esModule: true,
  registerHandler: jest.fn()
}))
jest.mock('../../../../src/common/config/config', () => ({
  __esModule: true,
  getInfo: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(false),
  getRuntime: jest.fn()
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
let aggregator
let featureName

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  aggregator = {}
  featureName = faker.string.uuid()
})

test('should merge info, jsattributes, and runtime objects', () => {
  const mockInfo1 = {
    [faker.string.uuid()]: faker.lorem.sentence(),
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }
  jest.mocked(gosCDN).mockReturnValue({ info: mockInfo1 })

  const mockInfo2 = {
    jsAttributes: {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
  }
  jest.mocked(getInfo).mockReturnValue(mockInfo2)

  const mockRuntime = {
    [faker.string.uuid()]: faker.lorem.sentence()
  }
  jest.mocked(getRuntime).mockReturnValue(mockRuntime)

  new AggregateBase(agentIdentifier, aggregator, featureName)

  expect(isConfigured).toHaveBeenCalledWith(agentIdentifier)
  expect(gosCDN).toHaveBeenCalledTimes(3)
  expect(getInfo).toHaveBeenCalledWith(agentIdentifier)
  expect(getRuntime).toHaveBeenCalledWith(agentIdentifier)
  expect(configure).toHaveBeenCalledWith({ agentIdentifier }, {
    info: {
      ...mockInfo1,
      jsAttributes: {
        ...mockInfo1.jsAttributes,
        ...mockInfo2.jsAttributes
      }
    },
    runtime: mockRuntime
  })
})

test('should only configure the agent once', () => {
  jest.mocked(isConfigured).mockReturnValue(true)

  new AggregateBase(agentIdentifier, aggregator, featureName)

  expect(isConfigured).toHaveBeenCalledWith(agentIdentifier)
  expect(gosCDN).not.toHaveBeenCalled()
  expect(getInfo).not.toHaveBeenCalled()
  expect(getRuntime).not.toHaveBeenCalled()
  expect(configure).not.toHaveBeenCalled()
})

test('should resolve waitForFlags correctly based on flags with real vals', async () => {
  const flagNames = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()]
  const aggregateBase = new AggregateBase(agentIdentifier, aggregator, featureName)
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
  const aggregateBase = new AggregateBase(agentIdentifier, aggregator, featureName)
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
  const aggregateBase = new AggregateBase('abcd', aggregator, featureName) // 'abcd' matches the af mock at the top of this file
  const flagWait = aggregateBase.waitForFlags()
  await expect(flagWait).resolves.toEqual([])
})
