import { getOrSet } from './get-or-set'

test('should return the current value of an existing property', () => {
  const obj = { foo: 'bar' }
  const prop = 'foo'
  const getVal = jest.fn()

  const result = getOrSet(obj, prop, getVal)

  expect(result).toBe('bar')
  expect(getVal).not.toHaveBeenCalled()
})

test('should set and return the value from getVal if the property does not exist', () => {
  const obj = {}
  const prop = 'foo'
  const getVal = jest.fn().mockReturnValue('baz')

  const result = getOrSet(obj, prop, getVal)

  expect(result).toBe('baz')
  expect(getVal).toHaveBeenCalled()
  expect(obj.foo).toBe('baz')
})

test('should set the property as non-enumerable if Object.defineProperty is supported', () => {
  const obj = {}
  const prop = 'foo'
  const getVal = jest.fn().mockReturnValue('baz')

  jest.spyOn(Object, 'defineProperty')

  const result = getOrSet(obj, prop, getVal)

  expect(result).toBe('baz')
  expect(Object.defineProperty).toHaveBeenCalledWith(obj, prop, {
    value: 'baz',
    writable: true,
    enumerable: false
  })
})

test('should set the property from getVal if Object.defineProperty and Object.keys are not supported', () => {
  const obj = {}
  const prop = 'foo'
  const getVal = jest.fn(() => 'baz')

  const originalFn = Object.defineProperty
  Object.defineProperty = null

  const result = getOrSet(obj, prop, getVal)

  expect(result).toBe('baz')
  expect(obj.foo).toBe('baz')
  expect(Object.prototype.propertyIsEnumerable.call(obj, 'foo')).toBe(true)

  Object.defineProperty = originalFn
})
