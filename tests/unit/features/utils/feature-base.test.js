import { faker } from '@faker-js/faker'
import { FeatureBase } from '../../../../src/features/utils/feature-base'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/feature-base')
jest.mock('../../../../src/common/event-emitter/contextual-ee', () => ({
  __esModule: true,
  ee: {
    get: jest.fn()
  }
}))

let agentIdentifier
let featureName
let agentRef
let mockEE

beforeEach(() => {
  agentIdentifier = faker.string.uuid()
  featureName = faker.string.uuid()
  mockEE = { [faker.string.uuid()]: faker.lorem.sentence() }
  agentRef = { agentIdentifier, ee: mockEE }
})

test('should set instance defaults', () => {
  const feature = new FeatureBase(agentRef, featureName)

  expect(feature.agentRef).toEqual(agentRef)
  expect(feature.featureName).toEqual(featureName)
  expect(feature.blocked).toEqual(false)
  expect(feature.ee).toEqual(mockEE)

  expect(ee.get).not.toHaveBeenCalled() // Should use agentRef.ee directly
})
