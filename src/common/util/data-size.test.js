import { dataSize } from './data-size'

describe('dataSize', () => {
  test('returns length of string', () => {
    const str = 'Hello, world!'
    expect(dataSize(str)).toBe(str.length)
  })

  test('returns undefined for non-object, number, or empty string', () => {
    expect(dataSize(Infinity)).toBeUndefined()
    expect(dataSize(12345)).toBeUndefined() // might not actually be by design, but this is how it works today
    expect(dataSize('')).toBeUndefined()
  })

  test('returns byte length of ArrayBuffer object', () => {
    const buffer = new ArrayBuffer(8)
    expect(dataSize(buffer)).toBe(8)
  })

  test('returns size of Blob object', () => {
    const blob = new Blob(['Hello, world!'], { type: 'text/plain' })
    expect(dataSize(blob)).toBe(blob.size)
  })

  test('returns undefined for FormData object', () => {
    const formData = new FormData()
    expect(dataSize(formData)).toBeUndefined()
  })

  test('returns length of JSON string representation of object', () => {
    const obj = {
      str: 'Hello, world!',
      num: 12345,
      nestedObj: {
        arr: [1, 2, 3]
      }
    }
    const expectedSize = JSON.stringify(obj).length
    expect(dataSize(obj)).toBe(expectedSize)
  })

  test('returns undefined for object with toJSON method that throws an error', () => {
    const obj = {
      toJSON: () => {
        throw new Error('Error in toJSON')
      }
    }
    expect(dataSize(obj)).toBeUndefined()
  })
})
