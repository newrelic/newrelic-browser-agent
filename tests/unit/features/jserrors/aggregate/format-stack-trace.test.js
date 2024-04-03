import { faker } from '@faker-js/faker'
import { formatStackTrace, truncateSize } from '../../../../../src/features/jserrors/aggregate/format-stack-trace'

describe('formatStackTrace', () => {
  test.each([
    {
      input: ['line 1', 'line 2', 'line 3', 'line 4'],
      expected: 'line 1\nline 2\nline 3\nline 4',
      title: 'Appends all stack lines together'
    },
    { input: ['', 'line 1', 'line 2'], expected: 'line 1\nline 2', title: 'Strips leading empty stack frame' },
    { input: ['line 1', 'line 2', ''], expected: 'line 1\nline 2', title: 'Strips ending empty stack frame' }
  ])('$title', ({ input, expected }) => {
    const result = formatStackTrace(input)

    expect(result).toEqual(expected)
  })

  test('truncates the middle of the stack lines when more than 100', () => {
    const input = Array.apply(null, Array(200))
      .map(() => faker.string.uuid())
    const expected = input.slice(0, 50).join('\n') + `\n< ...truncated ${input.length - 100} lines... >\n` + input.slice(-50).join('\n')

    const result = formatStackTrace(input)

    expect(result).toEqual(expected)
  })
})

describe('truncateSize', () => {
  test('should truncate stack string to max limit', () => {
    const maxSize = 65530
    const input = faker.string.sample(maxSize + 1)

    const result = truncateSize(input)

    expect(result).toEqual(input.slice(0, maxSize))
  })
})
