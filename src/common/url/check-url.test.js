import { validateAssetUrl } from './check-url'

test('validateAssetUrl works correctly', () => {
  expect(validateAssetUrl(undefined)).toEqual('')
  expect(validateAssetUrl(123)).toEqual('')
  expect(validateAssetUrl('')).toEqual('')
  expect(validateAssetUrl('/someRelativePath')).toEqual('')
  expect(validateAssetUrl('data://anotherscheme.com/')).toEqual('')
  expect(validateAssetUrl('invalid url')).toEqual('')

  expect(validateAssetUrl('www.missingscheme.com/')).toEqual('https://www.missingscheme.com/')
  expect(validateAssetUrl('http:/enforcescheme.net/')).toEqual('https://enforcescheme.net/')
  expect(validateAssetUrl('enforceendslash.net:1234')).toEqual('https://enforceendslash.net:1234/')
  expect(validateAssetUrl('https://www.absolutepath.org/somepath')).toEqual('https://www.absolutepath.org/somepath/')
  expect(validateAssetUrl('js-agent.nr.com:9876/foo/bar?query=search')).toEqual('https://js-agent.nr.com:9876/foo/bar/')
})
