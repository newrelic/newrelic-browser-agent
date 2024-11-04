import { faker } from '@faker-js/faker'

import * as encodeModule from '../../../../src/common/url/encode'
import * as submitDataModule from '../../../../src/common/util/submit-data'
import * as infoModule from '../../../../src/common/config/info'
import * as initModule from '../../../../src/common/config/init'
import * as runtimeModule from '../../../../src/common/config/runtime'
import { warn } from '../../../../src/common/util/console'
import { Obfuscator } from '../../../../src/common/util/obfuscate'
import { Harvest } from '../../../../src/common/harvest/harvest'

jest.enableAutomock()
jest.unmock('../../../../src/common/harvest/harvest')
let harvestInstance

beforeEach(() => {
  jest.mocked(runtimeModule.getRuntime).mockReturnValue({
    maxBytes: Infinity,
    harvestCount: 0,
    obfuscator: new Obfuscator()
  })

  harvestInstance = new Harvest()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('sendX', () => {
  beforeEach(() => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(jest.fn())
    jest.spyOn(harvestInstance, '_send').mockImplementation(jest.fn())
    jest.spyOn(harvestInstance, 'createPayload').mockReturnValue({})
  })

  test('should pass spec settings on to _send method', async () => {
    const endpoint = faker.string.uuid()
    const spec = {
      endpoint,
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestInstance.sendX(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith(expect.objectContaining(spec))
  })

  test('should create payload with retry true', async () => {
    const endpoint = faker.string.uuid()
    const spec = {
      endpoint,
      opts: {
        unload: false
      }
    }
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)

    harvestInstance.sendX(spec)

    expect(harvestInstance.createPayload).toHaveBeenCalledWith(spec.endpoint, { retry: true, isFinalHarvest: false })
  })

  test.each([undefined, {}])('should still call _send when spec is %s', async (spec) => {
    harvestInstance.sendX(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith({
      payload: {},
      submitMethod: expect.any(Function)
    })
  })
})

describe('send', () => {
  beforeEach(() => {
    jest.spyOn(harvestInstance, '_send').mockImplementation(jest.fn())
  })

  test('should pass spec settings on to _send method', async () => {
    const endpoint = faker.string.uuid()
    const spec = {
      endpoint,
      [faker.string.uuid()]: faker.lorem.sentence()
    }

    harvestInstance.send(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith(spec)
  })

  test.each([undefined, {}])('should still call _send when spec is %s', async (spec) => {
    harvestInstance.send(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith(spec || {})
  })
})

describe('_send', () => {
  let errorBeacon
  let submitMethod
  let spec
  let licenseKey

  beforeEach(() => {
    errorBeacon = faker.internet.domainName()
    licenseKey = faker.string.uuid()
    jest.mocked(infoModule.getInfo).mockReturnValue({
      errorBeacon,
      licenseKey
    })
    jest.mocked(runtimeModule.getRuntime).mockReturnValue({
      maxBytes: Infinity,
      harvestCount: 0
    })
    jest.mocked(initModule.getConfiguration).mockReturnValue({
      ssl: undefined,
      proxy: {}
    })

    spec = {
      endpoint: faker.string.uuid(),
      payload: {
        body: {
          [faker.string.uuid()]: faker.lorem.sentence()
        },
        qs: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      },
      opts: {}
    }
    submitMethod = jest.fn().mockReturnValue(true)
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitMethod)
  })

  test('should return false when info.errorBeacon is not defined', () => {
    jest.mocked(infoModule.getInfo).mockReturnValue({})

    const result = harvestInstance._send(spec)

    expect(result).toEqual(false)
    expect(submitMethod).not.toHaveBeenCalled()
  })

  test('should return false when body is empty and sendEmptyBody is false', () => {
    jest.spyOn(harvestInstance, 'cleanPayload').mockReturnValue({ body: {}, qs: {} })
    spec.opts.sendEmptyBody = false
    spec.cbFinished = jest.fn()

    const result = harvestInstance._send(spec)

    expect(result).toEqual(false)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({ sent: false })
  })

  test('should construct the rum url', () => {
    spec.endpoint = 'rum'

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://${errorBeacon}/1/${licenseKey}?`)
    })
  })

  test('should construct the non-rum url', () => {
    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://${errorBeacon}/${spec.endpoint}/1/${licenseKey}?`)
    })
  })

  test('able to use and send to proxy when defined', () => {
    jest.mocked(initModule.getConfiguration).mockReturnValue({ proxy: { beacon: 'some_other_string' } })
    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://some_other_string/${spec.endpoint}/1/${licenseKey}?`)
    })
  })

  test('should use the custom defined url', () => {
    spec.customUrl = faker.internet.url()

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`${spec.customUrl}?`)
    })
  })

  test('should not include the license key or base params in a raw url', () => {
    spec.raw = true

    const result = harvestInstance._send(spec)
    const queryString = Object.entries(spec.payload.qs)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: `https://${errorBeacon}/${spec.endpoint}?${queryString}`
    })
  })

  test('should remove leading ampersand from encoded payload params', () => {
    const queryString = Object.entries(spec.payload.qs)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')

    jest.mocked(encodeModule.obj).mockReturnValue(`&${queryString}`)
    spec.raw = true

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: JSON.stringify(spec.payload.body),
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: `https://${errorBeacon}/${spec.endpoint}?${queryString}`
    })
  })

  test('should not alter body when gzip qs is present', () => {
    spec.payload.qs.attributes += '&content_encoding=gzip'

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: spec.payload.body,
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://${errorBeacon}/${spec.endpoint}/1/${licenseKey}?`)
    })
  })

  test('should warn (once) if payload is large', () => {
    spec.payload.body = 'x'.repeat(1024 * 1024) // ~1mb string

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(warn).toHaveBeenCalledWith(28, expect.any(String))
    expect(warn).toHaveBeenCalledTimes(1)

    const result2 = harvestInstance._send(spec)
    expect(result2).toEqual(true)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('should set body to events when endpoint is events', () => {
    spec.endpoint = 'events'
    spec.payload.body = faker.lorem.sentence()

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: spec.payload.body,
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://${errorBeacon}/${spec.endpoint}/1/${licenseKey}?`)
    })
  })

  test.each([
    null,
    undefined,
    {},
    []
  ])('should set body to empty string when %s', (inputBody) => {
    spec.opts.sendEmptyBody = true
    spec.payload.body = inputBody

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: '',
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(`https://${errorBeacon}/${spec.endpoint}/1/${licenseKey}?`)
    })
  })

  test('should add a callback to XHR and call cbCallback when not a final harvest', () => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: faker.string.uuid()
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({ ...xhrState, sent: true, xhr: xhrState, fullUrl: expect.any(String) })
  })

  test('should set cbFinished state retry to true with delay when xhr has 429 status', () => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()
    harvestInstance.tooManyRequestsDelay = faker.number.int({ min: 100, max: 1000 })

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: 429
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({
      ...xhrState,
      sent: true,
      retry: true,
      delay: harvestInstance.tooManyRequestsDelay,
      xhr: xhrState,
      fullUrl: expect.any(String)
    })
  })

  test.each([
    408, 500, 503
  ])('should set cbFinished state retry to true without delay when xhr has %s status', (statusCode) => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: statusCode
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({
      ...xhrState,
      sent: true,
      retry: true,
      xhr: xhrState,
      fullUrl: expect.any(String)
    })
  })

  test('should include response in call to cbFinished when needResponse is true', () => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()
    spec.opts.needResponse = true

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: faker.string.uuid(),
      responseText: faker.lorem.sentence()
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({
      ...xhrState,
      sent: true,
      xhr: xhrState,
      fullUrl: expect.any(String)
    })
  })

  test('should not include response in call to cbFinished when needResponse is false', () => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()
    spec.opts.needResponse = false

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: faker.string.uuid(),
      responseText: faker.lorem.sentence()
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({
      ...xhrState,
      responseText: undefined,
      sent: true,
      xhr: xhrState,
      fullUrl: expect.any(String)
    })
  })

  test('should call cbFinished with sent false and status 0 when xhr failed locally', () => {
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)
    spec.cbFinished = jest.fn()

    const result = harvestInstance._send(spec)
    const xhrAddEventListener = jest.mocked(submitDataModule.xhr).mock.results[0].value.addEventListener
    const xhrLoadEndHandler = jest.mocked(xhrAddEventListener).mock.calls[0][1]

    const xhrState = {
      status: 0
    }
    xhrLoadEndHandler.call(xhrState)

    expect(xhrAddEventListener).toHaveBeenCalledWith('loadend', expect.any(Function), expect.any(Object))
    expect(result).toEqual(jest.mocked(submitDataModule.xhr).mock.results[0].value)
    expect(submitMethod).not.toHaveBeenCalled()
    expect(spec.cbFinished).toHaveBeenCalledWith({
      ...xhrState,
      sent: false,
      xhr: xhrState,
      fullUrl: expect.any(String)
    })
  })
})

describe('baseQueryString', () => {
  beforeEach(() => {
    jest.mocked(infoModule.getInfo).mockReturnValue({})
    jest.mocked(runtimeModule.getRuntime).mockReturnValue({})
  })

  test('should construct a string of base query parameters', () => {
    const applicationID = faker.string.uuid()
    const sa = faker.string.uuid()
    jest.mocked(infoModule.getInfo).mockReturnValue({
      applicationID,
      sa
    })
    const customTransaction = faker.string.uuid()
    const ptid = faker.string.uuid()
    jest.mocked(runtimeModule.getRuntime).mockReturnValue({
      customTransaction,
      ptid
    })

    const results = harvestInstance.baseQueryString()

    expect(results).toContain(`a=${applicationID}`)
    expect(encodeModule.param).toHaveBeenCalledWith('sa', sa)
    expect(results).toContain(`&sa=${sa}`)
    expect(encodeModule.param).toHaveBeenCalledWith('v', expect.stringMatching(/\d{1,3}\.\d{1,3}\.\d{1,3}/))
    expect(results).toMatch(/&v=\d{1,3}\.\d{1,3}\.\d{1,3}/)
    expect(encodeModule.param).toHaveBeenCalledWith('t', 'Unnamed Transaction')
    expect(results).toContain('&t=Unnamed%20Transaction')
    expect(encodeModule.param).toHaveBeenCalledWith('ct', customTransaction)
    expect(results).toContain(`&ct=${customTransaction}`)
    expect(results).toMatch(/&rst=\d{1,9}/)
    expect(results).toContain('&ck=0')
    expect(results).toContain('&s=0')
    expect(encodeModule.param).toHaveBeenCalledWith('ref', location)
    expect(results).toContain(`&ref=${encodeURIComponent(location)}`)
    expect(encodeModule.param).toHaveBeenCalledWith('ptid', ptid)
    expect(results).toContain(`&ptid=${ptid}`)
  })

  test('should set t param to info.tNamePlain', () => {
    const tNamePlain = faker.string.uuid()
    jest.mocked(infoModule.getInfo).mockReturnValue({
      tNamePlain
    })

    const results = harvestInstance.baseQueryString()

    expect(encodeModule.param).toHaveBeenCalledWith('t', tNamePlain)
    expect(results).toContain(`&t=${tNamePlain}`)
  })

  test('should set to param to info.transactionName and exclude t param', () => {
    const transactionName = faker.string.uuid()
    jest.mocked(infoModule.getInfo).mockReturnValue({
      transactionName
    })

    const results = harvestInstance.baseQueryString()

    expect(encodeModule.param).not.toHaveBeenCalledWith('t', expect.any(String))
    expect(results).not.toContain('&t=')
    expect(encodeModule.param).toHaveBeenCalledWith('to', transactionName)
    expect(results).toContain(`&to=${transactionName}`)
  })

  test('should default sa to empty string', () => {
    const results = harvestInstance.baseQueryString()

    expect(encodeModule.param).toHaveBeenCalledWith('sa', '')
    expect(results).toContain('&sa=')
  })

  test('should default s to 0', () => {
    const results = harvestInstance.baseQueryString()

    expect(results).toContain('&s=0')
  })

  test('should obfuscate ref', () => {
    const obfuscatedLocation = faker.string.uuid()
    jest.mocked(harvestInstance.obfuscator.obfuscateString).mockReturnValue(obfuscatedLocation)

    const results = harvestInstance.baseQueryString()

    expect(harvestInstance.obfuscator.obfuscateString).toHaveBeenCalledWith(location)
    expect(results).toContain(`&ref=${obfuscatedLocation}`)
  })

  test('should default ptid to empty string', () => {
    const results = harvestInstance.baseQueryString()

    expect(encodeModule.param).toHaveBeenCalledWith('ptid', '')
    expect(results).toContain('&ptid=')
  })
})

describe('createPayload', () => {
  test('should return empty body and qs values when no listeners exist', () => {
    const feature = faker.string.uuid()
    const results = harvestInstance.createPayload(feature)

    expect(results).toEqual({
      body: {},
      qs: {}
    })
  })

  test('should pass options to callback', () => {
    const feature = faker.string.uuid()
    const options = {
      [faker.string.uuid()]: faker.lorem.sentence()
    }
    const harvestCallback = jest.fn()

    harvestInstance.on(feature, harvestCallback)
    const results = harvestInstance.createPayload(feature, options)

    expect(results).toEqual({
      body: {},
      qs: {}
    })
  })

  test('should aggregate the body properties of the payload', () => {
    const feature = faker.string.uuid()
    const payloadA = {
      body: {
        [faker.string.uuid()]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      body: {
        [faker.string.uuid()]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const harvestCallbackA = jest.fn().mockReturnValue(payloadA)
    const harvestCallbackB = jest.fn().mockReturnValue(payloadB)

    harvestInstance.on(feature, harvestCallbackA)
    harvestInstance.on(feature, harvestCallbackB)
    const results = harvestInstance.createPayload(feature)

    expect(results).toEqual({
      body: {
        ...payloadA.body,
        ...payloadB.body
      },
      qs: {}
    })
  })

  test('should aggregate the qs properties of the payload', () => {
    const feature = faker.string.uuid()
    const payloadA = {
      qs: {
        [faker.string.uuid()]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      qs: {
        [faker.string.uuid()]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const harvestCallbackA = jest.fn().mockReturnValue(payloadA)
    const harvestCallbackB = jest.fn().mockReturnValue(payloadB)

    harvestInstance.on(feature, harvestCallbackA)
    harvestInstance.on(feature, harvestCallbackB)
    const results = harvestInstance.createPayload(feature)

    expect(results).toEqual({
      body: {},
      qs: {
        ...payloadA.qs,
        ...payloadB.qs
      }
    })
  })

  test('should not deep merge the body and qs properties', () => {
    const feature = faker.string.uuid()
    const bodyProp = faker.string.uuid()
    const qsProp = faker.string.uuid()
    const payloadA = {
      body: {
        [bodyProp]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      },
      qs: {
        [qsProp]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      body: {
        [bodyProp]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      },
      qs: {
        [qsProp]: {
          [faker.string.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const harvestCallbackA = jest.fn().mockReturnValue(payloadA)
    const harvestCallbackB = jest.fn().mockReturnValue(payloadB)

    harvestInstance.on(feature, harvestCallbackA)
    harvestInstance.on(feature, harvestCallbackB)
    const results = harvestInstance.createPayload(feature)

    expect(results).toEqual({
      body: payloadB.body,
      qs: payloadB.qs
    })
  })
})

describe('cleanPayload', () => {
  test('should remove undefined properties from body and qs', () => {
    const payload = {
      body: {
        foo: undefined,
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: undefined,
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }

    const results = harvestInstance.cleanPayload(payload)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })

  test('should remove null properties from body and qs', () => {
    const payload = {
      body: {
        foo: null,
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: null,
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }

    const results = harvestInstance.cleanPayload(payload)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })

  test('should remove empty string properties from body and qs', () => {
    const payload = {
      body: {
        foo: '',
        [faker.string.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: '',
        [faker.string.uuid()]: faker.lorem.sentence()
      }
    }

    const results = harvestInstance.cleanPayload(payload)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })

  test.each([
    { [faker.string.uuid()]: { [faker.string.uuid()]: faker.number.int({ min: 100, max: 1000 }) } },
    { [faker.string.uuid()]: faker.number.int({ min: 100, max: 1000 }) },
    { [faker.string.uuid()]: new Uint8Array(faker.number.int({ min: 100, max: 1000 })) }
  ])('should retain %s properties in body and qs', (input) => {
    const payload = {
      body: input,
      qs: input
    }

    const results = harvestInstance.cleanPayload(payload)

    expect(results.body).toEqual(input)
    expect(results.qs).toEqual(input)
  })
})
