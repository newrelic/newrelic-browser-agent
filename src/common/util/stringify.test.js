import { stringify } from './stringify'

var mockEmit = jest.fn()
jest.mock('../event-emitter/contextual-ee', () => ({
  __esModule: true,
  get ee () {
    return { emit: mockEmit }
  }
}))

test('should return a JSON string representation of the value', () => {
  const obj = { a: 1, b: { nested: true } }
  const expected = '{"a":1,"b":{"nested":true}}'

  const result = stringify(obj)

  expect(result).toBe(expected)
})

test('should handle circular references and exclude them from the JSON output', () => {
  const obj = { a: 1 }
  obj.b = obj // Create a circular reference
  const expected = '{"a":1}'

  const result = stringify(obj)

  expect(result).toBe(expected)
})

test('should handle non-object values and return their string representation', () => {
  const value = 42
  const expected = '42'

  const result = stringify(value)

  expect(result).toBe(expected)
})

test('should emit an "internal-error" event if an error occurs during JSON.stringify', () => {
  const obj = { a: 1 }

  jest.spyOn(JSON, 'stringify').mockImplementation(() => {
    throw new Error('message')
  })

  stringify(obj)

  expect(mockEmit).toHaveBeenCalledWith('internal-error', expect.any(Array))
})
