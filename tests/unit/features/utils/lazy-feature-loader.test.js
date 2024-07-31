import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../../../../src/loaders/features/features'
import { lazyFeatureLoader } from '../../../../src/features/utils/lazy-feature-loader'

// Use enableAutomock to make it easier to mock all the things that get imported by the aggregators
jest.enableAutomock()
// Unmock the file under test and the constants file
jest.unmock('../../../../src/loaders/features/features')
jest.unmock('../../../../src/features/utils/lazy-feature-loader')

const randomIds = {}
const featureRedirects = {
  [FEATURE_NAMES.pageAction]: FEATURE_NAMES.genericEvents
}

test.each(Object.keys(FEATURE_NAMES))('should import the aggregate for feature %s', async (key) => {
  const featureName = featureRedirects[FEATURE_NAMES[key]] || FEATURE_NAMES[key] // deprecated page_actions redirects to use generic events, otherwise use provided key
  /** since both generic events and page actions now use the same mocked agg, the randomId should be buffered/referenced here instead of overwriting */
  const randomId = randomIds[featureName] || faker.string.uuid()
  randomIds[featureName] ??= randomId

  jest.setMock(`../../../../src/features/${featureName}/aggregate`, {
    id: randomId,
    featureName
  })

  const result = await lazyFeatureLoader(featureName, 'aggregate')

  expect(result.id).toEqual(randomId)
  expect(result.featureName).toEqual(featureName)
})

test('should throw an error when the featureName is not supported', async () => {
  const featureName = faker.string.uuid()

  expect(() => lazyFeatureLoader(featureName, 'aggregate')).toThrow()
})

test('should return undefined when the featurePart is not supported', async () => {
  const featureName = faker.string.uuid()
  const featurePart = faker.string.uuid()

  expect(lazyFeatureLoader(featureName, featurePart)).toBeUndefined()
})
