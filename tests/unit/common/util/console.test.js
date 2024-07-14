import { warn } from '../../../../src/common/util/console'

beforeEach(() => {
  console.debug = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('warn', () => {
  test('should not call console.debug if it is not a function', () => {
    const spy = jest.spyOn(console, 'warn')
    console.debug = undefined
    warn('test message')
    expect(spy).not.toHaveBeenCalled()
  })

  test('should call console.debug with a prefixed message', () => {
    warn(1000)
    expect(console.debug).toHaveBeenCalledWith('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/warning-codes.md#1000')
  })

  test('should call console.debug with secondary argument if provided', () => {
    const secondary = 'secondary value'
    warn('test message', secondary)
    expect(console.debug).toHaveBeenCalledWith(secondary)
  })

  test('should not call console.debug with secondary argument if not provided', () => {
    warn('test message')
    expect(console.debug).toHaveBeenCalledTimes(1)
  })
})
