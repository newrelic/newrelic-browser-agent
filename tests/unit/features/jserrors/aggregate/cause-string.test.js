import { buildCauseString } from '../../../../../src/features/jserrors/aggregate/cause-string'
import * as computeStackTraceModule from '../../../../../src/features/jserrors/aggregate/compute-stack-trace'

describe('buildCauseString', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns an empty string when no cause is present', () => {
    const err = new Error('Test error without cause')
    expect(buildCauseString(err)).toBe('')
  })

  it('returns the computed stack string of the cause if it is an Error', () => {
    const cause = new Error('This is the cause')
    const err = new Error('Test error with cause', { cause })
    expect(buildCauseString(err)).toContain(computeStackTraceModule.computeStackTrace(cause).stackString)
  })

  it('returns the stack string of the cause if it is an Error that cant be computed', () => {
    const cause = new Error('This is the cause')
    const err = new Error('Test error with cause', { cause })
    jest.spyOn(computeStackTraceModule, 'computeStackTrace').mockReturnValue({ stackString: '' })
    expect(buildCauseString(err)).toContain(cause.stack)
  })

  it('returns the string representation of a string cause', () => {
    const err = new Error('Test error with string cause', { cause: 'This is a string cause' })
    expect(buildCauseString(err)).toBe('This is a string cause')
  })

  it('returns the string representation of a (stringifyable) non-string cause', () => {
    const err = new Error('Test error with non-string cause', { cause: { toJSON: () => 'Non-string cause' } })
    expect(buildCauseString(err)).toBe(JSON.stringify('Non-string cause'))
  })

  it('returns the string representation of a (non-stringifyable) non-string cause', () => {
    const err = new Error('Test error with non-string cause', { cause: { toJSON: () => { throw new Error() }, toString: () => 'Non-string cause' } })
    expect(buildCauseString(err)).toBe('Non-string cause')
  })

  it('returns the string representation of a complex object as a fallback', () => {
    const err = new Error('Test error with complex object as cause', { cause: { key: 'value' } })
    expect(buildCauseString(err)).toContain('"key":"value"')
  })
})
