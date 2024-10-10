import { evaluateInternalError } from '../../../../../src/features/jserrors/aggregate/internal-errors'

describe('isInternalError', () => {
  it('should not swallow and reason "Other" when no internal flag and no specific error', () => {
    const stackInfo = {
      frames: [{ url: 'some-other-script.js' }],
      message: 'Some error message'
    }
    const result = evaluateInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: false, reason: 'Other' })
  })

  it('should swallow and reason "Rrweb-Security-Policy" for nr-recorder security policy error', () => {
    const stackInfo = {
      frames: [{ url: 'nr-123-recorder.min.js' }],
      message: 'An attempt was made to break through the security policy of the user agent'
    }
    const result = evaluateInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb-Security-Policy' })
  })

  it('should swallow and reason "Rrweb-Security-Policy" for rrweb security policy error', () => {
    const stackInfo = {
      frames: [{ url: 'fake/rrweb/file.js' }],
      message: 'An attempt was made to break through the security policy of the user agent'
    }
    const result = evaluateInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb-Security-Policy' })
  })

  it('should swallow and reason "Other" for any error when internal flag is true', () => {
    const stackInfo = {
      frames: [{ url: 'some-other-script.js' }],
      message: 'Some error message'
    }
    const result = evaluateInternalError(stackInfo, true)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Other' })
  })

  it('should swallow and reason "Other" for any error when internal flag is true and no frames', () => {
    const stackInfo = {
      message: 'Some error message'
    }
    const result = evaluateInternalError(stackInfo, true)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Other' })
  })

  it('should swallow and reason "Other" for any error when internal flag is true and no message', () => {
    const stackInfo = {
      frames: [{ url: 'some-other-script.js' }]
    }
    const result = evaluateInternalError(stackInfo, true)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Other' })
  })

  it('should not swallow and reason "Other" for recorder errors that are incomplete', () => {
    const stackInfo = {
      frames: [{ url: 'fake/rrweb/file.js' }]
    }
    const result = evaluateInternalError(stackInfo)
    expect(result).toEqual({ shouldSwallow: false, reason: 'Other' })
  })

  it('should swallow and reason "Rrweb" for non-security policy error in nr-recorder', () => {
    const stackInfo = {
      frames: [{ url: 'nr-123-recorder.min.js' }],
      message: 'Some other error message'
    }
    const result = evaluateInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb' })
  })

  it('should swallow and reason "Rrweb" for non-security policy error in rrweb', () => {
    const stackInfo = {
      frames: [{ url: 'fake/rrweb/file.js' }],
      message: 'Some other error message'
    }
    const result = evaluateInternalError(stackInfo, false)
    expect(result).toEqual({ shouldSwallow: true, reason: 'Rrweb' })
  })
})
