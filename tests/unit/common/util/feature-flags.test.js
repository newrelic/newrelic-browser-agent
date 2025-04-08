import { faker } from '@faker-js/faker'
import * as eventEmitterModule from '../../../../src/common/event-emitter/contextual-ee'
import * as handleModule from '../../../../src/common/event-emitter/handle'
import * as drainModule from '../../../../src/common/drain/drain'
import { activateFeatures, activatedFeatures } from '../../../../src/common/util/feature-flags'

jest.enableAutomock()
jest.unmock('../../../../src/common/util/feature-flags')

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
  activateFeatures(input, { agentIdentifier, ee: eventEmitterModule.ee.get(agentIdentifier) })

  expect(handleModule.handle).not.toHaveBeenCalled()
  expect(drainModule.drain).not.toHaveBeenCalled()
  expect(activatedFeatures[agentIdentifier]).toEqual({})
})

test('emits the right events when feature flag = 1', () => {
  const flags = {
    st: 1,
    err: 1,
    ins: 1,
    spa: 1,
    sr: 1
  }
  activateFeatures(flags, { agentIdentifier, ee: eventEmitterModule.ee.get(agentIdentifier) })

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenCalledTimes(1)
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp', [flags])

  expect(activatedFeatures[agentIdentifier]).toEqual(flags)
})

test('emits the right events when feature flag = 0', () => {
  const flags = {
    st: 1,
    err: 1,
    ins: 1,
    spa: 1,
    sr: 1
  }
  activateFeatures(flags, { agentIdentifier, ee: eventEmitterModule.ee.get(agentIdentifier) })

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenCalledTimes(1)
  expect(sharedEE).toHaveBeenLastCalledWith('rumresp', [flags])

  expect(activatedFeatures[agentIdentifier]).toEqual(flags)
})

test('only the first activate of the same feature is respected', () => {
  activateFeatures({ st: 1 }, { agentIdentifier, ee: eventEmitterModule.ee.get(agentIdentifier) })

  const sharedEE = eventEmitterModule.ee.get(agentIdentifier).emit

  expect(sharedEE).toHaveBeenNthCalledWith(1, 'rumresp', [{ st: 1 }])

  sharedEE.mockClear()
  activateFeatures({ st: 0 }, { agentIdentifier, ee: eventEmitterModule.ee.get(agentIdentifier) })
  expect(activatedFeatures[agentIdentifier].st).toBeTruthy()
})
