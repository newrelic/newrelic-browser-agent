import { canonicalFunctionName } from './canonical-function-name'

test.each([
  {
    input: null,
    expected: undefined,
    title: 'Return undefined if no function name'
  },
  { input: 'test', expected: 'test', title: 'Simple function name' },
  {
    input: 'scope1/scope2/func',
    expected: 'func',
    title: 'Remove Firefox scopes'
  },
  { input: 'scope1.func', expected: 'func', title: 'Remove Chrome scopes' },
  {
    input: '<anonymous>',
    expected: undefined,
    title: 'Return undefined ending is non-alphanumeric'
  }
])('$title', ({ input, expected }) => {
  const result = canonicalFunctionName(input)

  expect(result).toEqual(expected)
})
