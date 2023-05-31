/**
 * @jest-environment jsdom
 * @jest-environment-options {"html": "<html><head><script></script></head><body></body></html>"}
 */

import { submitData } from './submit-data'

const mockWorkerScope = jest.fn().mockImplementation(() => false)
jest.mock('../util/global-scope', () => ({
  __esModule: true,
  get isWorkerScope () {
    return mockWorkerScope()
  }
}))

beforeEach(() => {
  jest.restoreAllMocks()
  mockWorkerScope.mockReturnValue(false)
})

describe('submitData.jsonp', () => {
  // This test requires a script tag to exist in the html set by this file's jest-environment-options header block.
  it('should return an HTMLScriptElement when called from a web window environment', () => {
    mockWorkerScope.mockReturnValue(false)

    const url = 'https://example.com/'
    const jsonp = 'callback'

    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBeInstanceOf(HTMLScriptElement)
    expect(result.type).toBe('text/javascript')
    expect(result.src).toBe('https://example.com/&jsonp=callback')
  })

  it('should try to use importScripts when called from a worker scope', () => {
    mockWorkerScope.mockReturnValueOnce(true)

    const url = 'https://example.com/'
    const jsonp = 'callback'

    global.importScripts = jest.fn()

    submitData.jsonp({ url, jsonp })

    expect(importScripts).toHaveBeenCalledWith('https://example.com/&jsonp=callback')

    delete global.importScripts
  })

  it('should fall back to an xhrGet call and return false when called from a worker scope', () => {
    mockWorkerScope.mockReturnValueOnce(true)

    const url = 'https://example.com/'
    const jsonp = 'callback'

    jest.spyOn(submitData, 'xhrGet').mockImplementation(jest.fn())

    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBe(false)
    expect(submitData.xhrGet).toHaveBeenCalledTimes(1)
  })

  it('should not throw an error if any error occurs during execution', () => {
    jest.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('message') })

    const url = 'https://example.com/'
    const jsonp = 'callback'

    expect(() => {
      submitData.jsonp({ url, jsonp })
    }).not.toThrow()
  })
})

describe('submitData.xhrGet', () => {
  it('should return an XMLHttpRequest object', () => {
    const url = 'https://example.com/'

    const result = submitData.xhrGet({ url })

    expect(result).toBeInstanceOf(XMLHttpRequest)
  })

  it('should not throw an error if URL is not provided', () => {
    expect(() => {
      submitData.xhrGet({})
    }).not.toThrow()
  })

  it('should not throw an error if an invalid URL is provided', () => {
    const url = 'invalid-url'

    expect(() => {
      submitData.xhrGet({ url })
    }).not.toThrow()
  })
})

describe('submitData.xhr', () => {
  it('should return an XMLHttpRequest object', () => {
    const result = submitData.xhrGet({ url: 'https://example.com/' })

    expect(result).toBeInstanceOf(XMLHttpRequest)
  })

  it('should not throw an error if URL is not provided', () => {
    expect(() => {
      submitData.xhr({})
    }).not.toThrow()
  })

  it('should not throw an error if an invalid URL is provided', () => {
    const url = 'invalid-url'

    expect(() => {
      submitData.xhr({ url })
    }).not.toThrow()
  })

  // it('should send a POST request by default', () => {
  //   const url = 'https://example.com/'

  //   const result = submitData.xhr({ url })
  //   jest.spyOn(result, 'open')

  //   expect(result.open).toHaveBeenCalledWith('POST', url, true)
  // })

  // it('should send a GET request if specified', () => {
  //   const url = 'https://example.com/'

  //   const result = submitData.xhr({ url, method: 'GET' })
  //   jest.spyOn(result, 'open')

  //   expect(result.open).toHaveBeenCalledWith('GET', url, true)
  // })

  // it('should send a request synchronously if specified', () => {
  //   const url = 'https://example.com/'

  //   const result = submitData.xhr({ url, sync: true })
  //   jest.spyOn(result, 'open')

  //   expect(result.open).toHaveBeenCalledWith('POST', url, false)
  // })

  // it('should set custom headers if provided', () => {
  //   const url = 'https://example.com/'
  //   const headers = [{ key: 'Content-Type', value: 'application/json' }]

  //   const result = submitData.xhr({ url, headers })
  //   jest.spyOn(result, 'setRequestHeader')

  //   headers.forEach((header) => {
  //     expect(result.setRequestHeader).toHaveBeenCalledWith(header.key, header.value)
  //   })
  // })

  // it('should send a request with the specified body', () => {
  //   const url = 'https://example.com/'
  //   const body = JSON.stringify({ key: 'value' })

  //   const result = submitData.xhr({ url, body })
  //   jest.spyOn(result, 'send')

  //   expect(result.send).toHaveBeenCalledWith(body)
  // })
})
