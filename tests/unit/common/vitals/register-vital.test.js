import { registerVital } from '../../../../src/common/vitals/register-vital'

describe('registerVital', () => {
  test('invokes the registration', () => {
    const register = jest.fn()
    registerVital(register)
    expect(register).toHaveBeenCalledTimes(1)
  })

  test('swallows a throwing registration', () => {
    const register = jest.fn(() => { throw new TypeError('performance.getEntriesByType is not a function') })
    expect(() => registerVital(register)).not.toThrow()
    expect(register).toHaveBeenCalledTimes(1)
  })
})
