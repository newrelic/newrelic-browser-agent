/**
 * @jest-environment jsdom
 * @jest-environment-options {"html": "<html><head><script></script></head><body></body></html>", "url": "https://example.com/"}
 */

import { faker } from '@faker-js/faker'
import { submitData } from './submit-data'
import * as globalScope from './global-scope'

jest.mock('./global-scope')

const url = 'https://example.com/api'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('submitData.jsonp', () => {
  beforeEach(() => {
    jest.replaceProperty(globalScope, 'isWorkerScope', false)
  })

  afterEach(() => {
    delete global.importScripts
  })

  // This test requires a script tag to exist in the html set by this file's jest-environment-options header block.
  test('should return an HTMLScriptElement when called from a web window environment', () => {
    const jsonp = faker.datatype.uuid()
    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBeInstanceOf(HTMLScriptElement)
    expect(result.type).toBe('text/javascript')
    expect(result.src).toBe(url + '&jsonp=' + jsonp)
  })

  test('should try to use importScripts when called from a worker scope', () => {
    jest.replaceProperty(globalScope, 'isWorkerScope', true)
    global.importScripts = jest.fn()

    const jsonp = faker.datatype.uuid()
    submitData.jsonp({ url, jsonp })

    expect(global.importScripts).toHaveBeenCalledWith(url + '&jsonp=' + jsonp)
  })

  test('should fall back to an xhrGet call and return false importScripts throws an error', () => {
    jest.replaceProperty(globalScope, 'isWorkerScope', true)
    jest.spyOn(submitData, 'xhrGet').mockImplementation(jest.fn())
    global.importScripts = jest.fn().mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

    const jsonp = faker.datatype.uuid()
    const result = submitData.jsonp({ url, jsonp })

    expect(result).toBe(false)
    expect(global.importScripts).toHaveBeenCalledWith(url + '&jsonp=' + jsonp)
    expect(submitData.xhrGet).toHaveBeenCalledWith({ url: url + '&jsonp=' + jsonp })
  })

  test('should not throw an error when xhrGet throws an error', () => {
    jest.replaceProperty(globalScope, 'isWorkerScope', true)
    jest.spyOn(submitData, 'xhrGet').mockImplementation(() => { throw new Error(faker.lorem.sentence()) })
    global.importScripts = jest.fn().mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

    const jsonp = faker.datatype.uuid()

    expect(() => submitData.jsonp({ url, jsonp })).not.toThrow()
  })

  test('should not throw an error when element insertion fails', () => {
    jest.spyOn(document, 'createElement').mockImplementation(() => { throw new Error(faker.lorem.sentence()) })

    const jsonp = faker.datatype.uuid()

    expect(() => submitData.jsonp({ url, jsonp })).not.toThrow()
  })
})

describe('submitData.xhrGet', () => {
  test('xhrGet should call xhr with GET as the method', () => {
    jest.spyOn(submitData, 'xhr').mockReturnValue(new XMLHttpRequest())

    const result = submitData.xhrGet({ url })

    expect(result).toBeInstanceOf(XMLHttpRequest)
    expect(submitData.xhr).toHaveBeenCalledWith({ url, sync: false, method: 'GET' })
  })
})

describe('submitData.xhr', () => {
  beforeEach(() => {
    jest.spyOn(global, 'XMLHttpRequest').mockImplementation(function () {
      this.prototype = XMLHttpRequest.prototype
      this.open = jest.fn()
      this.send = jest.fn()
      this.setRequestHeader = jest.fn()

      this._withCredentials = false
      Object.defineProperty(this, 'withCredentials', {
        get: jest.fn(() => this._withCredentials),
        set: jest.fn((val) => this._withCredentials = val)
      })
    })
  })

  test('should make and send an xhr with default values', () => {
    const result = submitData.xhr({ url })
    const xhr = jest.mocked(global.XMLHttpRequest).mock.instances[0]

    expect(result).toBeInstanceOf(XMLHttpRequest)
    expect(result.withCredentials).toBe(true)
    expect(xhr.open).toHaveBeenCalledWith('POST', url, true)
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('content-type', 'text/plain')
    expect(xhr.send).toHaveBeenCalledWith(null)
  })

  test('should send the body when provided', () => {
    const body = faker.lorem.paragraph()
    submitData.xhr({ url, body })
    const xhr = jest.mocked(global.XMLHttpRequest).mock.instances[0]

    expect(xhr.send).toHaveBeenCalledWith(body)
  })

  test('should set async to false', () => {
    submitData.xhr({ url, sync: true })
    const xhr = jest.mocked(global.XMLHttpRequest).mock.instances[0]

    expect(xhr.open).toHaveBeenCalledWith('POST', url, false)
  })

  test('should use the provided method', () => {
    submitData.xhr({ url, method: 'HEAD' })
    const xhr = jest.mocked(global.XMLHttpRequest).mock.instances[0]

    expect(xhr.open).toHaveBeenCalledWith('HEAD', url, true)
  })

  test('should use the provided headers', () => {
    const headers = [{ key: faker.lorem.word(), value: faker.datatype.uuid() }]
    submitData.xhr({ url, headers })
    const xhr = jest.mocked(global.XMLHttpRequest).mock.instances[0]

    expect(xhr.setRequestHeader).not.toHaveBeenCalledWith('content-type', 'text/plain')
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(headers[0].key, headers[0].value)
  })

  test('should not throw an error if withCredentials is not supported', () => {
    jest.spyOn(global, 'XMLHttpRequest').mockImplementation(function () {
      this.prototype = XMLHttpRequest.prototype
      this.open = jest.fn()
      this.send = jest.fn()
      this.setRequestHeader = jest.fn()
    })

    expect(() => submitData.xhr({ url })).not.toThrow()
  })

  test('should not throw an error if setRequestHeader throws an error', () => {
    jest.spyOn(global, 'XMLHttpRequest').mockImplementation(function () {
      this.prototype = XMLHttpRequest.prototype
      this.open = jest.fn()
      this.send = jest.fn()
      this.setRequestHeader = jest.fn()

      Object.defineProperty(this, 'withCredentials', {
        get: jest.fn().mockImplementation(() => { throw new Error(faker.lorem.sentence()) }),
        set: jest.fn().mockImplementation(() => { throw new Error(faker.lorem.sentence()) })
      })
    })

    expect(() => submitData.xhr({ url })).not.toThrow()
  })
})

describe('submitData.img', () => {
  test('should return an HTMLImageElement', () => {
    const imageUrl = 'https://example.com/image.png'

    const result = submitData.img({ url: imageUrl })

    expect(result).toBeInstanceOf(HTMLImageElement)
    expect(result.src).toBe(imageUrl)
  })
})

describe('submitData.beacon', () => {
  afterEach(() => {
    delete window.navigator.sendBeacon
  })

  test('should return true when beacon request succeeds', () => {
    window.navigator.sendBeacon = jest.fn().mockReturnValue(true)

    const body = faker.lorem.paragraph()
    const result = submitData.beacon({ url, body })

    expect(result).toBe(true)
    expect(window.navigator.sendBeacon).toHaveBeenCalledWith(url, body)
  })

  test('should return false when beacon request returns false', () => {
    window.navigator.sendBeacon = jest.fn().mockReturnValue(false)

    const result = submitData.beacon({ url })

    expect(result).toBe(false)
  })

  test('should return false when beacon request throws an error', () => {
    window.navigator.sendBeacon = jest.fn(() => { throw new Error(faker.lorem.sentence()) })

    const result = submitData.beacon({ url })

    expect(result).toBe(false)
  })

  test('should always bind window.navigator to the sendBeacon function', () => {
    window.navigator.sendBeacon = jest.fn().mockReturnValue(true)
    window.navigator.sendBeacon.bind = jest.fn(() => {})

    submitData.beacon({ url })

    expect(window.navigator.sendBeacon.bind).toHaveBeenCalledWith(window.navigator)
  })
})
