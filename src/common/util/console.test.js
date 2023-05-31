import { warn } from './console'

describe('console', () => {
  beforeEach(() => {
    console.warn = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('warn', () => {
    it('should not call console.warn if it is not a function', () => {
      const spy = jest.spyOn(console, 'warn')
      console.warn = undefined
      warn('test message')
      expect(spy).not.toHaveBeenCalled()
    })

    it('should call console.warn with a prefixed message', () => {
      warn('test message')
      expect(console.warn).toHaveBeenCalledWith('New Relic: test message')
    })

    it('should call console.warn with secondary argument if provided', () => {
      const secondary = 'secondary value'
      warn('test message', secondary)
      expect(console.warn).toHaveBeenCalledWith(secondary)
    })

    it('should not call console.warn with secondary argument if not provided', () => {
      warn('test message')
      expect(console.warn).toHaveBeenCalledTimes(1)
    })
  })
})
