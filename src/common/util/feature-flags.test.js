import { faker } from '@faker-js/faker'
import * as eventEmitterModule from '../event-emitter/contextual-ee'
import * as handleModule from '../event-emitter/handle'
import * as drainModule from '../drain/drain'
import { activateFeatures, activatedFeatures } from './feature-flags'
import { FEATURE_NAMES } from '../../loaders/features/features'

jest.enableAutomock()
jest.unmock('./feature-flags')

let agentIdentifier

let emitterFn

beforeEach(() => {
  agentIdentifier = faker.datatype.uuid()
  emitterFn = jest.fn()
  eventEmitterModule.ee.get = jest.fn(() => ({
    emit: emitterFn
  }))
})

afterEach(() => {
  Object.keys(activatedFeatures)
    .forEach(key => delete activatedFeatures[key])
})

test.each([
  null,
  undefined
])('should not do anything when flags is %s', (input) => {
  activateFeatures(input, agentIdentifier)

  expect(handleModule.handle).not.toHaveBeenCalled()
  expect(drainModule.drain).not.toHaveBeenCalled()
  expect(activatedFeatures).toEqual({})
})

const bucketMap = {
  stn: [FEATURE_NAMES.sessionTrace],
  err: [FEATURE_NAMES.jserrors, FEATURE_NAMES.metrics],
  ins: [FEATURE_NAMES.pageAction],
  spa: [FEATURE_NAMES.spa],
  sr: [FEATURE_NAMES.sessionReplay, FEATURE_NAMES.sessionTrace]
}

test('emits the right events when feature flag = 1', () => {
  const flags = {}
  Object.keys(bucketMap).forEach(flag => { flags[flag] = 1 })
  activateFeatures(flags, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  // each flag gets emitted to each of its mapped features, and a feat- AND a rumresp- for every emit, so (1+1+1+2)*2 = 14
  expect(sharedEE).toHaveBeenCalledTimes(10)
  expect(sharedEE).toHaveBeenNthCalledWith(1, 'feat-stn', [])
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp-sr', [1])

  Object.keys(flags).forEach(flag => { flags[flag] = true })
  expect(activatedFeatures).toEqual(flags)
})

test('emits the right events when feature flag = 0', () => {
  const flags = {}
  Object.keys(bucketMap).forEach(flag => { flags[flag] = 0 })
  activateFeatures(flags, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  // each flag gets emitted to each of its mapped features, and a block- AND a rumresp- for every emit, so (1+1+1+2)*2 = 10
  expect(sharedEE).toHaveBeenCalledTimes(10)
  expect(sharedEE).toHaveBeenNthCalledWith(1, 'block-stn', [])
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp-sr', [0])

  Object.keys(flags).forEach(flag => { flags[flag] = false })
  expect(activatedFeatures).toEqual(flags)
})

test('only the first activate of the same feature is respected', () => {
  activateFeatures({ stn: 1 }, agentIdentifier)

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenNthCalledWith(1, 'feat-stn', [])
  expect(sharedEE).toHaveBeenNthCalledWith(2, 'rumresp-stn', [1])

  sharedEE.mockClear()
  activateFeatures({ stn: 0 }, agentIdentifier)
  expect(sharedEE).not.toHaveBeenNthCalledWith(1, 'feat-stn', [])
  expect(activatedFeatures.stn).toBeTruthy()
})
