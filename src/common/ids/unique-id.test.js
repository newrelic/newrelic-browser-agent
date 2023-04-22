import crypto from 'crypto'
import * as uniqueId from './unique-id'

const getRandomValues = jest.fn(arr => crypto.randomBytes(arr.length))

afterEach(() => {
  delete global.crypto
})

describe('generateUuid', () => {
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  test('should generate a uuidv4 that matches the expected format', () => {
    const id = uniqueId.generateUuid()

    expect(uuidv4Regex.test(id)).toEqual(true)
  })

  test('should support using native crypto library', () => {
    global.crypto = { getRandomValues }

    const id = uniqueId.generateUuid()

    expect(uuidv4Regex.test(id)).toEqual(true)
    expect(getRandomValues).toHaveBeenCalledTimes(1)
  })
})

describe('generateRandomHexString', () => {
  const hexRegex = /^[0-9a-f]{8}$/

  test('should generate a valid hex string', () => {
    const id = uniqueId.generateRandomHexString(8)

    expect(hexRegex.test(id)).toEqual(true)
  })

  test('should support using native crypto library', () => {
    global.crypto = { getRandomValues }

    const id = uniqueId.generateRandomHexString(8)

    expect(hexRegex.test(id)).toEqual(true)
    expect(getRandomValues).toHaveBeenCalledTimes(1)
  })
})

test('generateSpanId should generate a 16 character hex string', () => {
  const id = uniqueId.generateSpanId()

  expect(/^[0-9a-f]{16}$/.test(id)).toEqual(true)
})

test('generateTraceId should generate a 32 character hex string', () => {
  const id = uniqueId.generateTraceId()

  expect(/^[0-9a-f]{32}$/.test(id)).toEqual(true)
})
