/**
 * @jest-environment jsdom
 */
import 'babel-polyfill'
import { NrFeatures } from '../../types'

describe('API', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
  })

  it('should set the exposed API method to the imported API method', async function() {
    const api = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    await api.initialize([NrFeatures.JSERRORS])
    expect(api.importedMethods.storeError).toEqual(jsErrors.storeError)
    api.noticeError('test')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should warn if not initialized', async function() {
    const api = await import('./api')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    api.noticeError('test')
    expect(spy).toHaveBeenCalled()
  })

  it('should warn if feature is disabled', async function() {
    const api = await import('./api')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    await api.initialize([])
    api.noticeError('test')
    expect(spy).toHaveBeenCalled()
  })

  it('should warn if error is invalid', async function() {
    const api = await import('./api')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    await api.initialize([NrFeatures.JSERRORS])
    // @ts-expect-error
    api.noticeError(1)
    expect(spy).toHaveBeenCalled()
  })

  it('should not warn  if initialized, not disabled, and has valid error', async function() {
    const api = await import('./api')
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    await api.initialize([NrFeatures.JSERRORS])
    const err = new Error("test")
    api.noticeError(err)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('should pass Error Object and custom attr args successfully to jsErrors.storeError', async function() {
    const api = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    const jsErrorsSpy = jest.spyOn(jsErrors, 'storeError').mockImplementation()
    const now = await import('../../../../../modules/common/timing/now')
    jest.spyOn(now, 'now').mockImplementation(() => 123)
    
    await api.initialize([NrFeatures.JSERRORS])
    const err = new Error("test")
    const customAttributes = {test: 1234}
    api.noticeError(err, customAttributes)
    expect(jsErrorsSpy).toHaveBeenCalledWith(err, 123, false, customAttributes)
  })

  it('should convert string to Error() and pass custom attr args successfully to jsErrors.storeError', async function() {
    const api = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    const jsErrorsSpy = jest.spyOn(jsErrors, 'storeError').mockImplementation()
    const now = await import('../../../../../modules/common/timing/now')
    jest.spyOn(now, 'now').mockImplementation(() => 123)
    
    await api.initialize([NrFeatures.JSERRORS])
    const err = "test"
    const customAttributes = {test: 1234}
    api.noticeError(err, customAttributes)
    expect(jsErrorsSpy).toHaveBeenCalledWith(new Error(err), 123, false, customAttributes)
  })

  it('should not pass invalid error arguments to jsErrors.storeError', async function() {
    const api = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    const jsErrorsSpy = jest.spyOn(jsErrors, 'storeError').mockImplementation()
    const now = await import('../../../../../modules/common/timing/now')
    jest.spyOn(now, 'now').mockImplementation(() => 123)
    
    await api.initialize([NrFeatures.JSERRORS])
    const invalidErrors = [1234, {test: 1234}, [1234], true, false, new Set([1234]), null, undefined]
    const customAttributes = {test: 1234}
    invalidErrors.forEach(err => {
      // @ts-expect-error
      api.noticeError(err, customAttributes)
      // @ts-expect-error
      expect(jsErrorsSpy).not.toHaveBeenCalledWith(new Error(err), 123, false, customAttributes)
    })
  })
})
