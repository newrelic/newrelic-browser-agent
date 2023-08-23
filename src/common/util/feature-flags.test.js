import { faker } from '@faker-js/faker'
import * as eventEmitterModule from '../event-emitter/contextual-ee'
import * as handleModule from '../event-emitter/handle'
import * as drainModule from '../drain/drain'
import { activateFeatures, activatedFeatures } from './feature-flags'
import { FEATURE_NAMES } from '../../loaders/features/features'

jest.mock('../event-emitter/handle')
jest.mock('../drain/drain')
jest.mock('../event-emitter/contextual-ee', () => ({
  __esModule: true,
  ee: {
    get: jest.fn(() => ({
      foo: `bar_${Math.random()}`
    }))
  }
}))

let agentIdentifier

beforeEach(() => {
  agentIdentifier = faker.datatype.uuid()
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

  const sharedEE = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value

  // each flag gets emitted to each of its mapped features, and a feat- AND a rumresp- for every emit, so (1+2+1+1+2)*2 = 14
  expect(handleModule.handle).toHaveBeenCalledTimes(14)
  expect(handleModule.handle).toHaveBeenNthCalledWith(1, 'feat-stn', [], undefined, FEATURE_NAMES.sessionTrace, sharedEE)
  expect(handleModule.handle).toHaveBeenLastCalledWith('rumresp-sr', [true], undefined, FEATURE_NAMES.sessionTrace, sharedEE)
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')

  Object.keys(flags).forEach(flag => { flags[flag] = true })
  expect(activatedFeatures).toEqual(flags)
})

test('emits the right events when feature flag = 0', () => {
  const flags = {}
  Object.keys(bucketMap).forEach(flag => { flags[flag] = 0 })
  activateFeatures(flags, agentIdentifier)

  const sharedEE = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value

  // each flag gets emitted to each of its mapped features, and a block- AND a rumresp- for every emit, so (1+2+1+1+2)*2 = 14
  expect(handleModule.handle).toHaveBeenCalledTimes(14)
  expect(handleModule.handle).toHaveBeenNthCalledWith(1, 'block-stn', [], undefined, FEATURE_NAMES.sessionTrace, sharedEE)
  expect(handleModule.handle).toHaveBeenLastCalledWith('rumresp-sr', [false], undefined, FEATURE_NAMES.sessionTrace, sharedEE)
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')

  Object.keys(flags).forEach(flag => { flags[flag] = false })
  expect(activatedFeatures).toEqual(flags)
})

test('only the first activate of the same feature is respected', () => {
  const flags = { stn: 1 }
  activateFeatures(flags, agentIdentifier)
  flags.stn = 0
  activateFeatures(flags, agentIdentifier)

  const sharedEE1 = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value
  const sharedEE2 = jest.mocked(eventEmitterModule.ee.get).mock.results[1].value

  expect(handleModule.handle).toHaveBeenNthCalledWith(1, 'feat-stn', [], undefined, 'session_trace', sharedEE1)
  expect(handleModule.handle).toHaveBeenNthCalledWith(2, 'rumresp-stn', [true], undefined, 'session_trace', sharedEE1)
  expect(handleModule.handle).not.toHaveBeenNthCalledWith(1, 'feat-stn', [], undefined, 'session_trace', sharedEE2)
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')
  expect(drainModule.drain).toHaveBeenCalledTimes(2)
  expect(activatedFeatures.stn).toBeTruthy()
})
