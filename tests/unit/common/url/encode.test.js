import * as encode from '../../../../src/common/url/encode'

describe('query string encoding', () => {
  test('escapes string components except safe characters', () => {
    const input = 'Asdf:, :, /@$;'
    const expected = 'Asdf:,%20:,%20/@$;'

    expect(encode.qs(input)).toEqual(expected)
  })

  test('null and undefined value returns \'null\'', () => {
    expect(encode.qs(null)).toEqual('null')
    expect(encode.qs(undefined)).toEqual('null')
  })
})

describe('fromArray encoding', () => {
  test('cuts cleanly at end of byte', () => {
    const input = ['a', 'b', 'c']
    const expected = 'ab'

    expect(encode.fromArray(input, 2)).toEqual(expected)
  })

  test('fall back to largest whole chunk', () => {
    const input = ['aa', 'bb', 'cc']
    const expected = 'aabb'

    expect(encode.fromArray(input, 5)).toEqual(expected)
  })
})

describe('object encoding', () => {
  test('cuts cleanly at end of byte', () => {
    const input = { foo: [1, 2, 3] }
    const expected = '&foo=%5B1,2%5D'

    expect(encode.obj(input, 12)).toEqual(expected)
  })

  test('fall back to largest whole chunk', () => {
    const input = { bar: ['a', 'b', 'c'] }
    const expected = '&bar=%5B%22a%22,%22b%22%5D'

    expect(encode.obj(input, 30)).toEqual(expected)
  })

  test('handles circular objects', () => {
    // eslint-disable-next-line sonarjs/prefer-object-literal
    const circular = {}
    circular.circular = circular
    const input = { bar: ['a', circular, 'c'] }
    const expected = '&bar=%5B%22a%22,%7B%7D,%22c%22%5D'

    expect(encode.obj(input, 1000)).toEqual(expected)
  })

  test('handles circular arrays', () => {
    const circular = []
    circular.push(circular)
    const input = { bar: ['a', circular, 'c'] }
    const expected = '&bar=%5B%22a%22,%5Bnull%5D,%22c%22%5D'

    expect(encode.obj(input, 1000)).toEqual(expected)
  })
})

describe('encode key value pairs as query params', () => {
  test('ignores input when value is null or undefined', () => {
    expect(encode.param('foo', null)).toEqual('')
    expect(encode.param('foo', undefined)).toEqual('')
  })

  test('encodes key value pair correctly', () => {
    expect(encode.param('foo', 'bar')).toEqual('&foo=bar')
  })

  test('ignores input when value is not a string', () => {
    expect(encode.param('foo', {})).toEqual('')
  })
})
