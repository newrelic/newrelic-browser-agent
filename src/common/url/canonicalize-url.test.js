afterEach(() => {
  jest.resetModules()
})

test.each([null, undefined, 34])('returns empty string when url argument is %s', async (url) => {
  const { canonicalizeUrl } = await import('./canonicalize-url')
  expect(canonicalizeUrl(url)).toEqual('')
})

test('strips URLs of query strings and fragments', async () => {
  jest.doMock('../util/global-scope', () => ({
    initialLocation: 'http://different-domain.com/'
  }))
  const { canonicalizeUrl } = await import('./canonicalize-url')
  expect(canonicalizeUrl('http://example.com/path?query=string#fragment')).toBe('http://example.com/path')
  expect(canonicalizeUrl('https://www.example.com/path/to/file.html?param=value')).toBe('https://www.example.com/path/to/file.html')
  expect(canonicalizeUrl('https://www.example.com/?param=value#fragment')).toBe('https://www.example.com/')
})

test('returns <inline> when matching the page URL of the loader', async () => {
  jest.doMock('../util/global-scope', () => ({
    initialLocation: 'http://example.com/'
  }))
  const { canonicalizeUrl } = await import('./canonicalize-url')
  expect(canonicalizeUrl('http://example.com/')).toEqual('<inline>')
})

test('does not identify sub-paths of the loader origin as <inline>', async () => {
  jest.doMock('../util/global-scope', () => ({
    initialLocation: 'http://example.com/'
  }))
  const { canonicalizeUrl } = await import('./canonicalize-url')
  expect(canonicalizeUrl('http://example.com/path/to/script.js')).not.toEqual('<inline>')
})
