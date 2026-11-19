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

describe('with required Array.prototype methods', () => {
  const descriptors = {}

  beforeEach(() => {
    ['at', 'findLast'].forEach(method => { descriptors[method] = Object.getOwnPropertyDescriptor(Array.prototype, method) })
  })

  afterEach(() => {
    // eslint-disable-next-line no-extend-native
    Object.entries(descriptors).forEach(([method, descriptor]) => Object.defineProperty(Array.prototype, method, descriptor))
  })

  test.each(['at', 'findLast'])('skips the registration when the required Array.prototype.%s is missing', (method) => {
    delete Array.prototype[method]
    const register = jest.fn()
    expect(() => registerVital(register, ['at', 'findLast'])).not.toThrow()
    expect(register).not.toHaveBeenCalled()
  })

  test('invokes the registration when only a method it does not require is missing', () => {
    delete Array.prototype.findLast
    const register = jest.fn()
    registerVital(register, ['at'])
    expect(register).toHaveBeenCalledTimes(1)
  })

  test('invokes a registration without requirements when both methods are missing', () => {
    delete Array.prototype.at
    delete Array.prototype.findLast
    const register = jest.fn()
    registerVital(register)
    expect(register).toHaveBeenCalledTimes(1)
  })
})
