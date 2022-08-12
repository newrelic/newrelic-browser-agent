/**
 * @jest-environment jsdom
 */
import 'babel-polyfill'
import { setInfo, setConfiguration, setLoaderConfig, setRuntime } from '@newrelic/browser-agent-core/common/config/config'

const id = '1234'

describe('API', () => {
  beforeEach(async () => {
    jest.resetModules()

    jest.resetAllMocks()
  })

  it('should set the exposed API method to the imported API method', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})

    const { Api } = await import('./api')
    const { initializeFeatures } = await import('../features/initialize')
    const { Features } = await import('../features/features')
    const { Aggregator } = await import('@newrelic/browser-agent-core/common/aggregate/aggregator')
    
    jest.mock('@newrelic/browser-agent-core/features/jserrors/aggregate', () => {
      return {
        Aggregate: jest.fn().mockImplementation(() => {
          return { storeError: jest.fn() }
        })
      }
    })
    jest.mock('@newrelic/browser-agent-core/features/jserrors/instrument', () => {
      return {
        Instrument: jest.fn().mockImplementation(() => {
          return {}
        })
      }
    })
    jest.mock('@newrelic/browser-agent-core/features/page-action/aggregate', () => {
      return {
        Aggregate: jest.fn().mockImplementation(() => {
          return { addPageAction: jest.fn() }
        })
      }
    })
    jest.mock('@newrelic/browser-agent-core/features/page-action/instrument', () => {
      return {
        Instrument: jest.fn().mockImplementation(() => {
          return { }
        })
      }
    })

    const spy = jest.spyOn(console, 'warn').mockImplementation()
    const api = new Api({ id, initialized: true })
    await initializeFeatures(id, api, new Aggregator({ agentIdentifier: id }), new Features())

    expect(api.importedMethods.storeError).not.toEqual(null)
    expect(api.importedMethods.addPageAction).not.toEqual(null)
    
    api.noticeError('test')
    api.addPageAction('test')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should warn if JSError feature is disabled', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.storeError = null
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    api.noticeError('test')
    expect(spy).toHaveBeenCalled()
  })

  it('should warn if PageAction feature is disabled', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.addPageAction = null
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    api.addPageAction('test')
    expect(spy).toHaveBeenCalled()
  })

  it('should warn if error is invalid', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.storeError = jest.fn()
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    // @ts-expect-error
    api.noticeError(1)
    expect(spy).toHaveBeenCalled()
    expect(api.importedMethods.storeError).not.toHaveBeenCalled()
  })

  it('should warn if addPageAction received invalid arguments', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.addPageAction = jest.fn()
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    // @ts-expect-error
    api.addPageAction(1)
    expect(spy).toHaveBeenCalled()
    expect(api.importedMethods.addPageAction).not.toHaveBeenCalled()
  })

  it('should warn if parent is not initialized', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: false })
    api.importedMethods.storeError = jest.fn()
    api.importedMethods.addPageAction = jest.fn()
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    // @ts-expect-error
    api.noticeError(1)
    api.addPageAction('hello')
    expect(spy).toHaveBeenCalled()
    expect(api.importedMethods.storeError).not.toHaveBeenCalled()
    expect(api.importedMethods.addPageAction).not.toHaveBeenCalled()
  })

  it('should not warn if JSError module is initialized, not disabled, and has valid error', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.storeError = jest.fn()
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    api.noticeError(new Error("test"))
    expect(spy).not.toHaveBeenCalled()
    expect(api.importedMethods.storeError).toHaveBeenCalled()
  })

  it('should not warn if PageAction module is initialized, not disabled, and has arguments', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    api.importedMethods.addPageAction = jest.fn()
    const spy = jest.spyOn(console, 'warn').mockImplementation()
    api.addPageAction('hello')
    expect(spy).not.toHaveBeenCalled()
    expect(api.importedMethods.addPageAction).toHaveBeenCalled()
  })

  it('should pass Error Object and custom attr args successfully to jsErrors.storeError', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    const mockFn = jest.fn()
    api.importedMethods.storeError = mockFn
    const err = new Error("test")
    const customAttr = { test: 1 }
    api.noticeError(err, customAttr)
    const { 0: errArg, 3: customAttrArg } = mockFn.mock.calls[0]
    expect(errArg).toEqual(err)
    expect(customAttrArg).toEqual(customAttr)
  })

  it("should pass PageAction name String and custom attr args successfully to core module's addPageAction", async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    const mockFn = jest.fn()
    api.importedMethods.addPageAction = mockFn
    const name = 'hello'
    const customAttr = { test: 1 }
    api.addPageAction(name, customAttr)
    const { 1: actionName, 2: customAttrArg } = mockFn.mock.calls[0]
    expect(actionName).toEqual(name)
    expect(customAttrArg).toEqual(customAttr)
  })

  it('should convert string to Error() and pass custom attr args successfully to jsErrors.storeError', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    const mockFn = jest.fn()
    api.importedMethods.storeError = mockFn
    const err = "test"
    const customAttr = { test: 1 }
    api.noticeError(err, customAttr)
    const { 0: errArg, 3: customAttrArg } = mockFn.mock.calls[0]
    expect(errArg).toEqual(new Error(err))
    expect(customAttrArg).toEqual(customAttr)
  })

  it('should not pass invalid error args to jsErrors.storeError', async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    const mockFn = jest.fn()
    api.importedMethods.storeError = mockFn

    const invalidErrors = [1234, { test: 1234 }, [1234], true, false, new Set([1234]), null, undefined]
    const customAttributes = { test: 1 }
    invalidErrors.forEach((err) => {
      // @ts-expect-error
      api.noticeError(err, customAttributes)
      expect(mockFn).not.toHaveBeenCalled()

    })
  })

  it("should not pass invalid args to core module's addPageAction", async function () {
    const { setInfo, setConfiguration, setLoaderConfig, setRuntime } = await import('@newrelic/browser-agent-core/common/config/config')
    setInfo(id, {})
    setConfiguration(id, {})
    setLoaderConfig(id, {})
    setRuntime(id, {})
    const { Api } = await import('./api')
    const api = new Api({ id, initialized: true })
    const mockFn = jest.fn()
    api.importedMethods.addPageAction = mockFn

    const invalidArguments = [
      [null], // missing first argument
      [{}], // first arg of wrong type
      ['hello', 'wrong'], // second arg of wrong type
    ]
    
    invalidArguments.forEach((args) => {
      // @ts-expect-error
      api.addPageAction(...args)
      expect(mockFn).not.toHaveBeenCalled()

    })
  })
})
