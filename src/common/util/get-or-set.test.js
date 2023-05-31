import { getOrSet } from './get-or-set'

describe('getOrSet', () => {
  it('should return the current value of an existing property', () => {
    const obj = { foo: 'bar' }
    const prop = 'foo'
    const getVal = jest.fn()

    const result = getOrSet(obj, prop, getVal)

    expect(result).toBe('bar')
    expect(getVal).not.toHaveBeenCalled()
  })

  it('should set and return the value from getVal if the property does not exist', () => {
    const obj = {}
    const prop = 'foo'
    const getVal = jest.fn(() => 'baz')

    const result = getOrSet(obj, prop, getVal)

    expect(result).toBe('baz')
    expect(getVal).toHaveBeenCalled()
    expect(obj.foo).toBe('baz')
  })

  it('should set the property as non-enumerable if Object.defineProperty is supported', () => {
    const obj = {}
    const prop = 'foo'
    const getVal = jest.fn(() => 'baz')

    jest.spyOn(Object, 'defineProperty')

    const result = getOrSet(obj, prop, getVal)

    expect(result).toBe('baz')
    expect(Object.defineProperty).toHaveBeenCalledWith(obj, prop, {
      value: 'baz',
      writable: true,
      enumerable: false
    })
  })

  it('should set the property from getVal if Object.defineProperty and Object.keys are not supported', () => {
    const obj = {}
    const prop = 'foo'
    const getVal = jest.fn(() => 'baz')

    const result = getOrSet(obj, prop, getVal)

    expect(result).toBe('baz')
    expect(obj.foo).toBe('baz')
  })
})
