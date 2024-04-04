import { stringHashCode } from '../../../../../src/features/jserrors/aggregate/string-hash-code'

test.each([
  { input: undefined, expected: 0, title: 'Return 0 for undefined input' },
  { input: null, expected: 0, title: 'Return 0 for null input' },
  { input: '', expected: 0, title: 'Return 0 for empty string input' },
  { input: 'lksjdflksjdf', expected: 32668720, title: 'Return valid hash of string' }
])('$title', ({ input, expected }) => {
  const result = stringHashCode(input)

  expect(result).toEqual(expected)
})
