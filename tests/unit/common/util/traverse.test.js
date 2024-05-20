import { applyFnToProps } from '../../../../src/common/util/traverse'

test.each(['not an object', null, undefined])('should return input unchanged when input is %p', (input) => {
  const result = applyFnToProps(input, jest.fn())
  expect(result).toEqual(input)
})

test('should apply the provided function only to properties of the specified type', () => {
  const obj = {
    stringProp: 'Hello',
    numberProp: 42,
    arrayProp: [1, 2, 3],
    objectProp: { foo: 'bar' }
  }

  const fn = jest.fn((value) => value.toUpperCase())

  const result = applyFnToProps(obj, fn, 'string')

  expect(result.stringProp).toBe('HELLO')
  expect(result.numberProp).toBe(42)
  expect(result.arrayProp).toEqual([1, 2, 3])
  expect(result.objectProp).toEqual({ foo: 'BAR' })

  expect(fn).toHaveBeenCalledTimes(2)
  expect(fn).toHaveBeenCalledWith('Hello')
  expect(fn).toHaveBeenCalledWith('bar')
})

test('should ignore properties specified in ignoreKeys', () => {
  const obj = {
    a: 1,
    b: 2,
    c: 3
  }

  const fn = jest.fn((value) => value + 1)

  const ignoreKeys = ['c']

  const result = applyFnToProps(obj, fn, 'number', ignoreKeys)

  expect(result.a).toBe(2)
  expect(result.b).toBe(3)
  expect(result.c).toBe(3)

  expect(fn).toHaveBeenCalledTimes(2)
  expect(fn).toHaveBeenCalledWith(1)
  expect(fn).toHaveBeenCalledWith(2)
})
