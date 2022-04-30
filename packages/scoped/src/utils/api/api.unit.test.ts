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
    const apiDefaults = await import('./api')
    const jsErrors = await import('../../../../../modules/features/js-errors/aggregate')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    await apiDefaults.initialize([NrFeatures.JSERRORS])
    expect(apiDefaults.api.noticeError).toEqual(jsErrors.storeError)
    apiDefaults.noticeError('test')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should warn if not initialized', async function() {
    const apiDefaults = await import('./api')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    apiDefaults.noticeError('test')
    expect(spy).toHaveBeenCalled()
  })

  it('should warn if feature is disabled', async function() {
    const apiDefaults = await import('./api')
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    await apiDefaults.initialize([])
    apiDefaults.noticeError('test')
    expect(spy).toHaveBeenCalled()
  })
})
