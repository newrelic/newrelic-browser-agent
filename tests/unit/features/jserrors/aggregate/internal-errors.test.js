import { isInternalError } from '../../../../../src/features/jserrors/aggregate/internal-errors'

describe('isInternalError', () => {
  it('should not swallow and reason "Other" when no internal flag and no specific error', () => {
    const stackInfo = {
      frames: ['some-other-script.js'],
      message: 'Some error message'
    }
    const result = isInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: false, reason: 'Other' })
  })

  it('should swallow and reason "Rrweb" for nr-recorder security policy error', () => {
    const stackInfo = {
      frames: ['nr-123-recorder.min.js'],
      message: 'An attempt was made to break through the security policy of the user agent'
    }
    const result = isInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb' })
  })

  it('should swallow and reason "Rrweb" for rrweb security policy error', () => {
    const stackInfo = {
      frames: ['rrweb'],
      message: 'An attempt was made to break through the security policy of the user agent'
    }
    const result = isInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb' })
  })

  it('should swallow and reason "Other" for any error when internal flag is true', () => {
    const stackInfo = {
      frames: ['some-other-script.js'],
      message: 'Some error message'
    }
    const result = isInternalError(stackInfo, true)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Other' })
  })

  it('should not swallow and reason "Other" for non-security policy error in nr-recorder', () => {
    const stackInfo = {
      frames: ['nr-123-recorder.min.js'],
      message: 'Some other error message'
    }
    const result = isInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: false, reason: 'Other' })
  })

  it('should not swallow and reason "Other" for non-security policy error in rrweb', () => {
    const stackInfo = {
      frames: ['rrweb'],
      message: 'Some other error message'
    }
    const result = isInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: false, reason: 'Other' })
  })
})
