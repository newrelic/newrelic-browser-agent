import { faker } from '@faker-js/faker'
import * as eventEmitterModule from '../event-emitter/contextual-ee'
import * as handleModule from '../event-emitter/handle'
import * as drainModule from '../drain/drain'
import { activateFeatures, activatedFeatures } from './feature-flags'

jest.enableAutomock()
jest.unmock('./feature-flags')

let agentIdentifier

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  const emitterFn = jest.fn()
  eventEmitterModule.ee.get = jest.fn(() => ({
    emit: emitterFn
  }))
})

afterEach(() => {
  Object.keys(activatedFeatures)
    .forEach(key => delete activatedFeatures[agentIdentifier][key])
})

test.each([
  null,
  undefined
])('should not do anything when flags is %s', (input) => {
  activateFeatures(input, agentIdentifier)

  expect(handleModule.handle).not.toHaveBeenCalled()
  expect(drainModule.drain).not.toHaveBeenCalled()
  expect(activatedFeatures[agentIdentifier]).toEqual({})
})

test('emits the right events when feature flag = 1', () => {
  const flags = {
    stn: 1,
    err: 1,
    ins: 1,
    spa: 1,
    sr: 1
  }
  activateFeatures(flags, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenCalledTimes(1)
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp', [flags])

  expect(activatedFeatures[agentIdentifier]).toEqual(flags)
})

test('emits the right events when feature flag = 0', () => {
  const flags = {
    stn: 1,
    err: 1,
    ins: 1,
    spa: 1,
    sr: 1
  }
  activateFeatures(flags, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenCalledTimes(1)
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp', [flags])

  expect(activatedFeatures[agentIdentifier]).toEqual(flags)
})

test('only the first activate of the same feature is respected', () => {
  activateFeatures({ stn: 1 }, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenNthCalledWith(1, 'rumresp', [{ stn: 1 }])

  sharedEE.mockClear()
  activateFeatures({ stn: 0 }, agentIdentifier)
  expect(activatedFeatures[agentIdentifier].stn).toBeTruthy()
})
