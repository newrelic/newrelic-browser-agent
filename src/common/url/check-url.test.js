import { isValidAssetUrl } from './check-url'

test('isValidAssetUrl works correctly', () => {
  expect(isValidAssetUrl(undefined)).toEqual(false)
  expect(isValidAssetUrl(123)).toEqual(false)
  expect(isValidAssetUrl('')).toEqual(false)
  expect(isValidAssetUrl('blah')).toEqual(false)
  expect(isValidAssetUrl('/someRelativePath')).toEqual(false)
  expect(isValidAssetUrl('www.missingscheme.com')).toEqual(false)
  expect(isValidAssetUrl('http://noendingslash.net')).toEqual(false)

  expect(isValidAssetUrl('http://absolutepath.net/')).toEqual(true)
  expect(isValidAssetUrl('https://www.absolutepath.org/')).toEqual(true)
  expect(isValidAssetUrl('data://anotherscheme.com/')).toEqual(true)
  expect(isValidAssetUrl('https://js-agent.nr.com/somepath/')).toEqual(true)
})
