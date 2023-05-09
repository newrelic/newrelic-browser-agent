import { canonicalizeUrl } from './canonicalize-url'

describe('canonicalizeUrl', () => {
  test('strips URLs of query strings and fragments', () => {
    expect(canonicalizeUrl('http://example.com/path?query=string#fragment')).toBe('http://example.com/path')
    expect(canonicalizeUrl('https://www.example.com/path/to/file.html?param=value')).toBe('https://www.example.com/path/to/file.html')
    expect(canonicalizeUrl('https://www.example.com/?param=value#fragment')).toBe('https://www.example.com/')
  })

  test('identifies URLs matching the specified loader origin as <inline>', () => {
    expect(canonicalizeUrl('http://example.com/?abc=123#fragment', 'http://example.com/')).toBe('<inline>')
  })

  test('does not identify sub-paths of the loader origin as <inline>', () => {
    expect(canonicalizeUrl('http://example.com/path/to/script.js', 'http://example.com/')).not.toBe('<inline>')
  })
})
