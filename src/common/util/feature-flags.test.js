import { faker } from '@faker-js/faker'
import * as eventEmitterModule from '../event-emitter/contextual-ee'
import * as handleModule from '../event-emitter/handle'
import * as drainModule from '../drain/drain'
import { activateFeatures, activatedFeatures } from './feature-flags'

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

test.each([
  { flag: 'stn', features: ['session_trace'] },
  { flag: 'err', features: ['jserrors', 'metrics'] },
  { flag: 'ins', features: ['page_action'] },
  { flag: 'spa', features: ['spa'] },
  { flag: 'sr', features: ['session_replay'] }
])('should activate the $features feature(s) when $flag=1', ({ flag, features }) => {
  const flags = { [flag]: 1 }
  activateFeatures(flags, agentIdentifier)

  const sharedEE = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value

  expect(handleModule.handle).toHaveBeenCalledWith(`feat-${flag}`, [], undefined, features, sharedEE)
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')
  expect(activatedFeatures).toEqual({ [flag]: true })
})

test.each([
  { flag: 'stn', features: ['session_trace'] },
  { flag: 'err', features: ['jserrors', 'metrics'] },
  { flag: 'ins', features: ['page_action'] },
  { flag: 'spa', features: ['spa'] },
  { flag: 'sr', features: ['session_replay'] }
])('should block the $features feature(s) when $flag=0', ({ flag, features }) => {
  const flags = { [flag]: 0 }
  activateFeatures(flags, agentIdentifier)

  const sharedEE = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value

  features.forEach(feature => {
    expect(handleModule.handle).toHaveBeenCalledWith(`block-${flag}`, [], undefined, feature, sharedEE)
  })
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')
  expect(activatedFeatures).toEqual({ })
})

test('should not activate the same feature more than once', () => {
  const flags = { stn: 1 }
  activateFeatures(flags, agentIdentifier)
  activateFeatures(flags, agentIdentifier)

  const sharedEE1 = jest.mocked(eventEmitterModule.ee.get).mock.results[0].value
  const sharedEE2 = jest.mocked(eventEmitterModule.ee.get).mock.results[1].value

  expect(handleModule.handle).toHaveBeenCalledWith('feat-stn', [], undefined, ['session_trace'], sharedEE1)
  expect(handleModule.handle).not.toHaveBeenCalledWith('feat-stn', [], undefined, ['session_trace'], sharedEE2)
  expect(handleModule.handle).toHaveBeenCalledTimes(1)
  expect(drainModule.drain).toHaveBeenCalledWith(agentIdentifier, 'page_view_event')
  expect(drainModule.drain).toHaveBeenCalledTimes(2)
  expect(activatedFeatures).toEqual({ stn: true })
})
