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
      sameOrigin: false
    }
  },
  {
    input: 'http://foo:bar@example.com:8080/path/@name?qs=5&a=b',
    expected: {
      hostname: 'example.com',
      pathname: '/path/@name',
      protocol: 'http',
      port: '8080',
      sameOrigin: false
    }
  },
  {
    input: 'https://foo:bar@example.com/path/name?qs=5&a=b',
    expected: {
      hostname: 'example.com',
      pathname: '/path/name',
      protocol: 'https',
      port: '443',
      sameOrigin: false
    }
  },
  {
    input: '/path/name?qs=5&a=b',
    expected: {
      hostname: location.hostname,
      pathname: '/path/name',
      protocol: location.protocol.split(':')[0],
      port: '80',
      sameOrigin: true
    }
  },
  {
    input: location.protocol + '//' + location.hostname + ':' + location.port + '/path/name?qs=5&a=b',
    expected: {
      hostname: location.hostname,
      pathname: '/path/name',
      protocol: location.protocol.split(':')[0],
      port: '80',
      sameOrigin: true
    }
  },
  {
    input: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
    expected: {
      protocol: 'data'
    }
  }
]

test.each(urlTests)('verify url parsing inside browser scope', async ({ input, expected }) => {
  jest.doMock('../util/global-scope', () => ({
    __esModule: true,
    isBrowserScope: true,
    globalScope: global
  }))

  const { parseUrl } = await import('./parse-url')
  expect(parseUrl(input)).toEqual(expected)
})

test.each(urlTests)('verify url parsing outside browser scope', async ({ input, expected }) => {
  jest.doMock('../util/global-scope', () => ({
    __esModule: true,
    isBrowserScope: false,
    globalScope: global
  }))

  const { parseUrl } = await import('./parse-url')
  expect(parseUrl(input)).toEqual(expected)
})

test('should cache parsed urls', async () => {
  jest.doMock('../util/global-scope', () => ({
    __esModule: true,
    isBrowserScope: true,
    globalScope: global
  }))

  const input = 'http://example.com/'
  const expected = {
    hostname: 'example.com',
    pathname: '/',
    protocol: 'http',
    port: '80',
    sameOrigin: false
  }

  jest.spyOn(document, 'createElement')

  const { parseUrl } = await import('./parse-url')
  parseUrl(input)

  expect(parseUrl(input)).toEqual(expected)
  expect(document.createElement).toHaveBeenCalledTimes(1)
})
