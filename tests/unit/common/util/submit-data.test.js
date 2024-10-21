/**
 * @jest-environment jsdom
 * @jest-environment-options {"html": "<html><head><script></script></head><body></body></html>", "url": "https://example.com/"}
 */

import { faker } from '@faker-js/faker'
import * as runtimeModule from '../../../../src/common/constants/runtime'
import * as submitData from '../../../../src/common/util/submit-data'

jest.enableAutomock()
jest.unmock('../../../../src/common/util/submit-data')

const url = 'https://example.com/api'

afterEach(() => {
  jest.clearAllMocks()
})

describe('getSubmitMethod', () => {
  test('should use xhr for final harvest when isBrowserScope is false', () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', false)

    expect(submitData.getSubmitMethod({ isFinalHarvest: true })).toEqual(submitData.xhr)
  })

  test('should use beacon for final harvest when isBrowserScope is true', () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)

    expect(submitData.getSubmitMethod({ isFinalHarvest: true })).toEqual(submitData.beacon)
  })

  test.each([
    null, undefined, false
  ])('should use xhr when final harvest is %s', (isFinalHarvest) => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)

    expect(submitData.getSubmitMethod({ isFinalHarvest })).toEqual(submitData.xhr)
  })

  test('should use xhr when opts is undefined', () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)

    expect(submitData.getSubmitMethod()).toEqual(submitData.xhr)
  })
})

describe('xhr', () => {
  beforeEach(() => {
    jest.spyOn(global, 'XMLHttpRequest').mockImplementation(function () {
      this.prototype = XMLHttpRequest.prototype
      this.open = jest.fn()
      this.send = jest.fn()
      this.setRequestHeader = jest.fn()

      this._withCredentials = false
      Object.defineProperty(this, 'withCredentials', {
        get: jest.fn(() => this._withCredentials),
        set: jest.fn((val) => { this._withCredentials = val })
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
    const headers = [{ key: faker.lorem.word(), value: faker.string.uuid() }]
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

describe('beacon', () => {
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
