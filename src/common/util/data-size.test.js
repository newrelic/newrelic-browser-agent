import { faker } from '@faker-js/faker'
import * as stringifyModule from './stringify'
import { dataSize } from './data-size'

jest.mock('./stringify', () => ({
  __esModule: true,
  stringify: jest.fn()
}))

describe('dataSize', () => {
  test('returns length of string', () => {
    const str = faker.lorem.sentence()
    expect(dataSize(str)).toBe(str.length)
  })

  test('returns undefined for non-object, number, or empty string', () => {
    expect(dataSize(Infinity)).toBeUndefined()
    expect(dataSize(NaN)).toBeUndefined()
    expect(dataSize(12345)).toBeUndefined()
    expect(dataSize('')).toBeUndefined()
  })

  test('returns byte length of ArrayBuffer object', () => {
    const buffer = new ArrayBuffer(faker.datatype.number({ min: 10, max: 100 }))
    expect(dataSize(buffer)).toBe(buffer.byteLength)
  })

  test('returns size of Blob object', () => {
    const blob = new Blob([faker.lorem.sentence()], { type: 'text/plain' })
    expect(dataSize(blob)).toBe(blob.size)
  })

  test('returns undefined for FormData object', () => {
    const formData = new FormData()
    expect(dataSize(formData)).toBeUndefined()
  })

  test('uses stringify to get the length of an object', () => {
    const input = {
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }
    const expectedSize = faker.datatype.number({ min: 1000, max: 10000 })

    jest.spyOn(stringifyModule, 'stringify').mockReturnValue({ length: expectedSize })

    expect(dataSize(input)).toBe(expectedSize)
  })

  test('should not throw an exception if stringify throws an exception', () => {
    const input = {
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }
    const expectedSize = faker.datatype.number({ min: 1000, max: 10000 })

    jest.spyOn(stringifyModule, 'stringify').mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

    expect(() => dataSize(input)).not.toThrow()
    expect(dataSize(input)).toBeUndefined()
  })
})
