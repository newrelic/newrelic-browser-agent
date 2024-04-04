import { faker } from '@faker-js/faker'
import { FeatureBase } from '../../../../src/features/utils/feature-base'
import { ee } from '../../../../src/common/event-emitter/contextual-ee'

jest.enableAutomock()
jest.unmock('../../../../src/features/utils/feature-base')
jest.mock('../../../../src/common/config/config', () => ({
  __esModule: true,
  getRuntime: jest.fn().mockReturnValue({
    isolatedBacklog: true
  })
}))
jest.mock('../../../../src/common/event-emitter/contextual-ee', () => ({
  __esModule: true,
  ee: {
    get: jest.fn()
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

it('should set instance defaults', () => {
  const mockEE = { [faker.string.uuid()]: faker.lorem.sentence() }
  jest.mocked(ee.get).mockReturnValue(mockEE)

  const feature = new FeatureBase(agentIdentifier, aggregator, featureName)

  expect(feature.agentIdentifier).toEqual(agentIdentifier)
  expect(feature.aggregator).toEqual(aggregator)
  expect(feature.featureName).toEqual(featureName)
  expect(feature.blocked).toEqual(false)
  expect(feature.ee).toEqual(mockEE)

  expect(ee.get).toHaveBeenCalledWith(agentIdentifier)
})
