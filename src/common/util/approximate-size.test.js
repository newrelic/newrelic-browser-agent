import { approximateSize } from './approximate-size'

describe('approximateSize', () => {
  it('should return 4 for null', () => {
    expect(approximateSize(null)).toBe(4)
  })

  it('should return 0 for undefined', () => {
    expect(approximateSize(undefined)).toBe(0)
  })

  it('should return 4 for true', () => {
    expect(approximateSize(true)).toBe(4)
  })

  it('should return 5 for false', () => {
    expect(approximateSize(false)).toBe(5)
  })

  it('should return the correct size for a string', () => {
    expect(approximateSize('hello')).toBe(7) // 5 characters + 2 double quotes
  })

  it('should handle an escape character', () => {
    expect(approximateSize('\r')).toBe(3) // 1 character + 2 double quotes
  })

  it('should return the correct size for a number', () => {
    expect(approximateSize(1234)).toBe(4)
    expect(approximateSize(0.0)).toBe(1)
    expect(approximateSize(-1234.9264482983349)).toBe(18)
  })

  it('should return the correct size for a Date object', () => {
    expect(approximateSize(new Date())).toBe(26) // 24 characters + 2 double quotes
  })

  test('calculates size of ArrayBuffer object correctly', () => {
    const buffer = new ArrayBuffer(8)
    expect(approximateSize(buffer)).toBe(8)
  })

  test('calculates size of Blob object correctly', () => {
    const blob = new Blob(['Hello, world!'], { type: 'text/plain' })
    expect(approximateSize(blob)).toBe(blob.size)
  })

  it('should return the correct size for an array', () => {
    expect(approximateSize([1, 2, 'hello'])).toBe(13) // 2 brackets + 2 commas + sizes of the elements
    expect(approximateSize([])).toBe(2) // empty array
  })

  it('should return the correct size for an object', () => {
    expect(approximateSize({ a: 1, b: 'hello' })).toBe(19) // 2 brackets + 2 colons + 6 double quotes + 1 comma + sizes of the keys and values
    expect(approximateSize({})).toBe(2) // empty object
  })

  it('should handle circular references correctly', () => {
    const obj = { a: 1 }
    obj.b = obj // circular reference
    expect(approximateSize(obj)).toBe(12) // {a: 1, b: }
  })

  it('should return the correct size for nested objects and arrays', () => {
    const obj = {
      a: [1, 2, { b: 'hello', c: [3, 4] }],
      d: { e: 5, f: { g: true } }
    }
    expect(approximateSize(obj)).toBe(62)
  })

  it('should yield the same size as JSON.stringify(...).length in a typical case', () => {
    const data = [
      {
        guid: 'b2a86ff9-d8ef-4956-879c-37502fd1947f',
        index: 0,
        isActive: false,
        registered: new Date(),
        latitude: -63.612923,
        longitude: 97.870232,
        tags: ['adipisicing', 'dolor', 'adipisicing', 'ex', 'dolor', 'culpa', 'exercitation'],
        friends: [
          { id: 0, name: 'Allison' },
          { id: 1, name: 'Shahram' },
          { id: 2, name: 'Dominic' }
        ]
      }
    ]
    const stringifySize = JSON.stringify(data).length
    const thisSize = approximateSize(data)
    expect(thisSize).toBe(stringifySize)
  })

  it('should support esoteric data types', () => {
    const dataTypes = [
      0,
      // eslint-disable-next-line no-new-wrappers
      new Number(0),
      Infinity,
      NaN,
      'asdf"\b\t\n\f\r\\',
      new Date(),
      {},
      new Error(),
      /./,
      false,
      // eslint-disable-next-line no-new-wrappers
      new Boolean(false),
      class FooBar {},
      class {},
      function () {},
      () => {},
      Symbol.for('test'),
      JSON.stringify({ foo: 'bar' })
    ]
    const thisSize = approximateSize(dataTypes)
    expect(thisSize).toBeGreaterThan(0)
  })

  test('calculates size of complex object correctly', () => {
    const obj = {
      str: 'Hello, world!',
      num: 12345,
      date: new Date(),
      buffer: new ArrayBuffer(8),
      blob: new Blob(['Hello, world!'], { type: 'text/plain' }),
      nestedObj: {
        arr: [1, 2, 3],
        nestedArr: [[1, 2], [3, 4]]
      }
    }
    const expectedSize =
      1 + // {
      21 + // "str":"Hello, world!"
      12 + // ,"num":12345
      34 + // ,"date":"2023-04-24T15:37:19.279Z"
      18 + // ,"buffer":<byteLength of 8>
      21 + // ,"blob":<size of 13>
      54 + // ,"nestedObj":{"arr":[1,2,3],"nestedArr":[[1,2],[3,4]]}
      1 // }
    expect(approximateSize(obj)).toBe(expectedSize)
  })
})
