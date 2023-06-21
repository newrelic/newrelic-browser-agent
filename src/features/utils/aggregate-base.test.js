import { faker } from '@faker-js/faker'
import { AggregateBase } from './aggregate-base'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { getInfo, isConfigured, getRuntime } from '../../common/config/config'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'

jest.enableAutomock()
jest.unmock('./aggregate-base')
jest.mock('./feature-base', () => ({
  __esModule: true,
  FeatureBase: jest.fn(function (...args) {
    this.agentIdentifier = args[0]
    this.aggregator = args[1]
    this.featureName = args[2]
  })
}))
jest.mock('../../common/event-emitter/register-handler', () => ({
  __esModule: true,
  registerHandler: jest.fn()
}))
jest.mock('../../common/config/config', () => ({
  __esModule: true,
  getInfo: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(false),
  getRuntime: jest.fn()
}))
jest.mock('../../loaders/configure/configure', () => ({
  __esModule: true,
  configure: jest.fn()
}))
jest.mock('../../common/window/nreum', () => ({
  __esModule: true,
  gosCDN: jest.fn().mockReturnValue({})
}))

let agentIdentifier
let aggregator
let featureName

beforeEach(() => {
  agentIdentifier = faker.datatype.uuid()
  aggregator = {}
  featureName = faker.datatype.uuid()
})

test('should merge info, jsattributes, and runtime objects', () => {
  const mockInfo1 = {
    [faker.datatype.uuid()]: faker.lorem.sentence(),
    jsAttributes: {
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }
  }
  jest.mocked(gosCDN).mockReturnValue({ info: mockInfo1 })

  const mockInfo2 = {
    jsAttributes: {
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }
  }
  jest.mocked(getInfo).mockReturnValue(mockInfo2)

  const mockRuntime = {
    [faker.datatype.uuid()]: faker.lorem.sentence()
  }
  jest.mocked(getRuntime).mockReturnValue(mockRuntime)

  new AggregateBase(agentIdentifier, aggregator, featureName)

  expect(isConfigured).toHaveBeenCalledWith(agentIdentifier)
  expect(gosCDN).toHaveBeenCalledTimes(3)
  expect(getInfo).toHaveBeenCalledWith(agentIdentifier)
  expect(getRuntime).toHaveBeenCalledWith(agentIdentifier)
  expect(configure).toHaveBeenCalledWith(agentIdentifier, {
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

test('should resolve waitForFlags correctly based on flags', async () => {
  const flagNames = [faker.datatype.uuid(), faker.datatype.uuid()]
  const aggregateBase = new AggregateBase(agentIdentifier, aggregator, featureName)
  aggregateBase.ee = {
    [faker.datatype.uuid()]: faker.lorem.sentence()
  }
  aggregateBase.feature = {
    [faker.datatype.uuid()]: faker.lorem.sentence()
  }

  const flagWait = aggregateBase.waitForFlags(flagNames)
  jest.mocked(registerHandler).mock.calls[0][1](true)
  jest.mocked(registerHandler).mock.calls[1][1](false)

  expect(registerHandler).toHaveBeenCalledWith(`rumresp-${flagNames[0]}`, expect.any(Function), featureName, aggregateBase.ee)
  expect(registerHandler).toHaveBeenCalledWith(`rumresp-${flagNames[1]}`, expect.any(Function), featureName, aggregateBase.ee)
  await expect(flagWait).resolves.toEqual([true, false])
})

test('should not register any handlers when flagNames is empty', async () => {
  const aggregateBase = new AggregateBase(agentIdentifier, aggregator, featureName)

  await expect(aggregateBase.waitForFlags()).resolves.toEqual([])
  expect(registerHandler).not.toHaveBeenCalled()
})
