import { parseUrl } from './parse-url'

afterEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

const urlTests = [
  {
    input: 'http://example.com/path/name?qs=5&a=b',
    expected: {
      hostname: 'example.com',
      pathname: '/path/name',
      protocol: 'http',
      port: '80',
      sameOrigin: false,
      search: '?qs=5&a=b'
    }
  },
  {
    input: 'http://foo:bar@example.com:8080/path/@name?qs=5&a=b',
    expected: {
      hostname: 'example.com',
      pathname: '/path/@name',
      protocol: 'http',
      port: '8080',
      sameOrigin: false,
      search: '?qs=5&a=b'
    }
  },
  {
    input: 'https://foo:bar@example.com/path/name?qs=5&a=b',
    expected: {
      hostname: 'example.com',
      pathname: '/path/name',
      protocol: 'https',
      port: '443',
      sameOrigin: false,
      search: '?qs=5&a=b'
    }
  },
  {
    input: '/path/name?qs=5&a=b',
    expected: {
      hostname: location.hostname,
      pathname: '/path/name',
      protocol: location.protocol.split(':')[0],
      port: '80',
      sameOrigin: true,
      search: '?qs=5&a=b'
    }
  },
  {
    input: location.protocol + '//' + location.hostname + ':' + location.port + '/path/name?qs=5&a=b',
    expected: {
      hostname: location.hostname,
      pathname: '/path/name',
      protocol: location.protocol.split(':')[0],
      port: '80',
      sameOrigin: true,
      search: '?qs=5&a=b'
    }
  },
  {
    input: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
    expected: {
      protocol: 'data'
    }
  }
]

test.each(urlTests)('verify url parsing', async ({ input, expected }) => {
  expect(parseUrl(input)).toEqual(expected)
})
