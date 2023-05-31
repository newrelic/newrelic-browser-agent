/**
 * @jest-environment jsdom
 * @jest-environment-options {"html": "<html><head><script></script></head><body></body></html>", "url": "https://example.com/"}
 */

import { submitData } from './submit-data'

const mockWorkerScope = jest.fn().mockImplementation(() => false)
jest.mock('./global-scope', () => ({
  __esModule: true,
  get isWorkerScope () {
    return mockWorkerScope()
  }
}))

const url = 'https://example.com/api'

beforeEach(() => {
  jest.restoreAllMocks()
  mockWorkerScope.mockReturnValue(false)
})

describe('submitData.jsonp', () => {
  // This test requires a script tag to exist in the html set by this file's jest-environment-options header block.
  it('should return an HTMLScriptElement when called from a web window environment', () => {
    mockWorkerScope.mockReturnValue(false)

    const jsonp = 'callback'

    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBeInstanceOf(HTMLScriptElement)
    expect(result.type).toBe('text/javascript')
    expect(result.src).toBe(url + '&jsonp=' + jsonp)
  })

  it('should try to use importScripts when called from a worker scope', () => {
    mockWorkerScope.mockReturnValueOnce(true)

    const jsonp = 'callback'

    global.importScripts = jest.fn()

    submitData.jsonp({ url, jsonp })

    expect(importScripts).toHaveBeenCalledWith(url + '&jsonp=' + jsonp)

    delete global.importScripts
  })

  it('should fall back to an xhrGet call and return false when called from a worker scope', () => {
    mockWorkerScope.mockReturnValueOnce(true)

    const jsonp = 'callback'

    jest.spyOn(submitData, 'xhrGet').mockImplementation(jest.fn())

    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBe(false)
    expect(submitData.xhrGet).toHaveBeenCalledTimes(1)
  })

  it('should not throw an error if any error occurs during execution', () => {
    jest.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('message') })

    const jsonp = 'callback'

    expect(() => {
      submitData.jsonp({ url, jsonp })
    }).not.toThrow()
  })
})

describe('submitData.xhrGet', () => {
  it('should return an XMLHttpRequest object', () => {
    const result = submitData.xhrGet({ url })
    expect(result).toBeInstanceOf(XMLHttpRequest)
  })

  it('should not throw an error if URL is not provided', () => {
    expect(() => {
      submitData.xhrGet({})
    }).not.toThrow()
  })

  it('should not throw an error if an invalid URL is provided', () => {
    expect(() => {
      submitData.xhrGet({ url: 'invalid url' })
    }).not.toThrow()
  })
})

describe('submitData.xhr', () => {
  it('should return an XMLHttpRequest object', () => {
    const result = submitData.xhrGet({ url })
    expect(result).toBeInstanceOf(XMLHttpRequest)
  })

  it('should not throw an error if URL is not provided', () => {
    expect(() => {
      submitData.xhr({})
    }).not.toThrow()
  })

  it('should not throw an error if an invalid URL is provided', () => {
    expect(() => {
      submitData.xhr({ url: 'invalid url' })
    }).not.toThrow()
  })

  it('should send a POST request by default', () => {
    jest.spyOn(XMLHttpRequest.prototype, 'open')

    submitData.xhr({ url })

    expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('POST', url, true)
  })

  it('should send a GET request if specified', () => {
    jest.spyOn(XMLHttpRequest.prototype, 'open')

    submitData.xhr({ url, method: 'GET' })

    expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('GET', url, true)
  })

  // This test requires a same-origin url to be set by this file's jest-environment-options header block.
  it('should send a request synchronously if specified', () => {
    jest.spyOn(XMLHttpRequest.prototype, 'open')

    submitData.xhr({ url, sync: true })

    expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('POST', url, false)
  })

  it('should set custom headers if provided', () => {
    const headers = [{ key: 'Content-Type', value: 'application/json' }]

    jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader')

    submitData.xhr({ url, headers })

    headers.forEach((header) => {
      expect(XMLHttpRequest.prototype.setRequestHeader).toHaveBeenCalledWith(header.key, header.value)
    })
  })

  it('should send a request with the specified body', () => {
    const body = JSON.stringify({ key: 'value' })

    jest.spyOn(XMLHttpRequest.prototype, 'send')

    submitData.xhr({ url, body })

    expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith(body)
  })
})

describe('submitData.img', () => {
  it('should return an HTMLImageElement', () => {
    const imageUrl = 'https://example.com/image.png'

    const result = submitData.img({ url: imageUrl })

    expect(result).toBeInstanceOf(HTMLImageElement)
  })

  it('should not throw an error if URL is not provided', () => {
    expect(() => {
      submitData.img({})
    }).not.toThrow()
  })

  it('should set the src attribute of the image element to the provided URL', () => {
    const imageUrl = 'https://example.com/image.png'

    const result = submitData.img({ url: imageUrl })

    expect(result.src).toBe(imageUrl)
  })
})

describe('submitData.beacon', () => {
  it('should return true when beacon request succeeds', () => {
    const body = JSON.stringify({ key: 'value' })

    window.navigator.sendBeacon = {
      bind: jest.fn(() => () => true)
    }

    const result = submitData.beacon({ url, body })

    expect(result).toBe(true)
  })

  it('should return false when beacon request fails', () => {
    const body = JSON.stringify({ key: 'value' })

    window.navigator.sendBeacon = {
      bind: jest.fn(() => () => { throw new Error('message') })
    }

    const result = submitData.beacon({ url, body })

    expect(result).toBe(false)
  })

  it('should error if sendBeacon is not supported', () => {
    const body = JSON.stringify({ key: 'value' })

    window.navigator.sendBeacon = undefined

    expect(() => {
      submitData.beacon({ url, body })
    }).toThrow()
  })
})
