import { sHash } from './s-hash'

describe('sHash', () => {
  it('should return the correct hash for a string', () => {
    const result = sHash('Hello, World!')
    expect(result).toBe(7725)
  })

  it('should return 0 for an empty string', () => {
    const result = sHash('')
    expect(result).toBe(0)
  })

  it('should throw an error when trying to hash null', () => {
    expect(() => {
      sHash(null)
    }).toThrow()
  })

  it('should throw an error when trying to hash undefined', () => {
    expect(() => {
      sHash(undefined)
    }).toThrow()
  })

  it('should handle special characters correctly', () => {
    const result = sHash('!@#$%^&*()')
    expect(result).toBe(2531)
  })
})
