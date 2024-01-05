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

describe('#826 trace id should be unique', () => {
  test('should not generate subsequent ids that are the same', () => {
    expect(uniqueId.generateTraceId()).not.toEqual(uniqueId.generateTraceId())
  })
})

describe('rough randomness tests', () => {
  /**
   * This tests the distribution of each hex character. The distribution of each character
   * should approach 1.0 to show that each character is being used as evenly as possible to
   * produce the resulting string.
   */
  test('should have sufficient distribution of 8 bit character usage', () => {
    const tally = new Map()
    const sampleSize = 100000 // A large sample size but not so large that it causes the test to take forever

    for (let i = 0; i < sampleSize; i++) {
      const chars = uniqueId.generateTraceId().split('')
      chars.forEach(char => {
        if (!tally.has(char)) {
          tally.set(char, 1)
        } else {
          tally.set(char, (tally.get(char)) + 1)
        }
      })
    }

    tally.forEach((distributionCount) => {
      /*
        Take the square root of the distribution count as a variance stabilization:
        https://en.wikipedia.org/wiki/Variance-stabilizing_transformation

        Divide by the total number of possible values accounting for placement within the
        resulting string:
        16 === the number of unique hex characters
        32 === the length of the string returned by our random function
        sampleSize === the total number of times we are running the function

        Subtract 1 to make the result into a percentage.
       */
      const distributionDeviation = 1 - Math.sqrt(distributionCount) / (16 * 32 * sampleSize)
      expect(distributionDeviation).toBeGreaterThanOrEqual(0.999)
    })
  })

  /**
   * This tests the distribution of each hex character. The distribution of each character
   * should approach 1.0 to show that each character is being used as evenly as possible to
   * produce the resulting string.
   */
  test('should have sufficient distribution of sequential characters', () => {
    const tally = new Map()
    const sampleSize = 100000 // A large sample size but not so large that it causes the test to take forever

    for (let i = 0; i < sampleSize; i++) {
      const chars = uniqueId.generateTraceId().split('')

      chars.forEach((char, index) => {
        let charSequence

        if (index === 0) {
          charSequence = `_${char}`
        } else {
          charSequence = `${chars[index - 1]}${char}`
        }

        if (!tally.has(charSequence)) {
          tally.set(charSequence, 1)
        } else {
          tally.set(charSequence, (tally.get(charSequence)) + 1)
        }
      })
    }

    tally.forEach((distributionCount) => {
      /*
        Take the square root of the distribution count as a variance stabilization:
        https://en.wikipedia.org/wiki/Variance-stabilizing_transformation

        Divide by the total number of possible values accounting for placement within the
        resulting string:
        16 === the number of unique hex characters
        32 === the length of the string returned by our random function
        sampleSize === the total number of times we are running the function

        Subtract 1 to make the result into a percentage.
       */
      const distributionDeviation = 1 - Math.sqrt(distributionCount) / (16 * 32 * sampleSize)
      expect(distributionDeviation).toBeGreaterThanOrEqual(0.999)
    })
  })
})
