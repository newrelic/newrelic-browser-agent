import { faker } from '@faker-js/faker'
import * as globalScopeModule from '../../../../src/common/constants/runtime'
import * as cleanUrlModule from '../../../../src/common/url/clean-url'
import { canonicalizeUrl } from '../../../../src/common/url/canonicalize-url'

jest.mock('../../../../src/common/constants/runtime')
jest.mock('../../../../src/common/url/clean-url')

beforeEach(() => {
  jest.spyOn(cleanUrlModule, 'cleanURL').mockImplementation(input => input)
  jest.replaceProperty(globalScopeModule, 'initialLocation', faker.internet.url())
})

afterEach(() => {
  jest.resetAllMocks()
})

test.each([null, undefined, 34])('returns empty string when url argument is %s', async (url) => {
  expect(canonicalizeUrl(url)).toEqual('')
})

test('uses cleanURL to clean the input and initial location URLs', () => {
  const url = faker.internet.url()
  canonicalizeUrl(url)

  expect(cleanUrlModule.cleanURL).toHaveBeenCalledWith(globalScopeModule.initialLocation)
  expect(cleanUrlModule.cleanURL).toHaveBeenCalledWith(url)
  expect(cleanUrlModule.cleanURL).toHaveBeenCalledTimes(2)
})

test('returns <inline> when input and initial page urls are the same', async () => {
  expect(canonicalizeUrl(globalScopeModule.initialLocation)).toEqual('<inline>')
})

test('returns input url when it does not match initial page url', async () => {
  const url = faker.internet.url()

  expect(canonicalizeUrl(url)).toEqual(url)
})

test('does not identify sub-paths of the loader origin as <inline>', async () => {
  const url = globalScopeModule.initialLocation + '/path/to/script.js'

  expect(canonicalizeUrl(url)).not.toEqual('<inline>')
})
