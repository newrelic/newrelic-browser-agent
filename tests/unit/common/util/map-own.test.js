import { mapOwn } from '../../../../src/common/util/map-own'

test('enumerates the object properties', () => {
  const callback = jest.fn()
  const input = { foo: 'bar' }

  mapOwn(input, callback)

  expect(callback).toHaveBeenCalledWith('foo', 'bar')
})

test('return array of results from callback invocation', () => {
  const callback = jest.fn((key, value) => `${key}:${value}`)
  const input = { foo: 'bar', biz: 'baz' }

  const result = mapOwn(input, callback)

  expect(result.length).toEqual(2)
  expect(result).toContain('foo:bar')
  expect(result).toContain('biz:baz')
})

test('does not iterate symbol properties', () => {
  const callback = jest.fn((key, value) => `${key}:${value}`)
  const input = { foo: 'bar', [Symbol.for('biz')]: 'baz' }

  const result = mapOwn(input, callback)

  expect(result.length).toEqual(1)
})

test('does not iterate inherited properties', () => {
  function F () {}
  F.prototype = { biz: 'baz' }

  const callback = jest.fn((key, value) => `${key}:${value}`)
  const input = new F()
  input.foo = 'bar'

  const result = mapOwn(input, callback)

  expect(result.length).toEqual(1)
})

test.each([null, undefined])('returns empty array when passed object is null or undefined', (input) => {
  const callback = jest.fn()
  const result = mapOwn(input, callback)

  expect(Array.isArray(result)).toEqual(true)
  expect(result.length).toEqual(0)
  expect(callback).toHaveBeenCalledTimes(0)
})
