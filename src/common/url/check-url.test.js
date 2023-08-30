import { validateServerUrl } from './check-url'

test('validateServerUrl works correctly', () => {
  expect(validateServerUrl(undefined)).toEqual('')
  expect(validateServerUrl(123)).toEqual('')
  expect(validateServerUrl('')).toEqual('')
  expect(validateServerUrl('/someRelativePath')).toEqual('') // should warn about rel path
  expect(validateServerUrl('data://anotherscheme.com/')).toEqual('') // should warn about scheme
  expect(validateServerUrl('http:/enforcescheme.net/')).toEqual('') // should warn about scheme
  expect(validateServerUrl('invalid url')).toEqual('')

  expect(validateServerUrl('www.missingscheme.com/')).toEqual('https://www.missingscheme.com/')
  expect(validateServerUrl('enforceendslash.net:1234')).toEqual('https://enforceendslash.net:1234/')
  expect(validateServerUrl('https://www.absolutepath.org/somepath')).toEqual('https://www.absolutepath.org/somepath/')
  expect(validateServerUrl('js-agent.nr.com:9876/foo/bar?query=search')).toEqual('https://js-agent.nr.com:9876/foo/bar/')

  expect(validateServerUrl('missingscheme.unsecureparam.com/', true)).toEqual('http://missingscheme.unsecureparam.com/')
  expect(validateServerUrl('http://hasscheme.unsecureparam.com/', true)).toEqual('') // should warn about scheme
})
