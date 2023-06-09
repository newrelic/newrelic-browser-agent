import { faker } from '@faker-js/faker'
import * as submitDataModule from '../util/submit-data'
import * as configModule from '../config/config'
import { Harvest } from './harvest'

jest.mock('../context/shared-context', () => ({
  __esModule: true,
  SharedContext: function () {
    this.sharedContext = {
      agentIdentifier: 'abcd'
    }
  }
}))
jest.mock('../config/config', () => ({
  __esModule: true,
  getConfigurationValue: jest.fn(),
  getInfo: jest.fn().mockReturnValue({
    errorBeacon: 'example.com',
    licenseKey: 'abcd'
  }),
  getRuntime: jest.fn().mockReturnValue({
    bytesSent: {},
    queryBytesSent: {}
  })
}))
jest.mock('../util/submit-data', () => ({
  __esModule: true,
  getSubmitMethod: jest.fn(),
  xhr: jest.fn(() => ({
    addEventListener: jest.fn()
  })),
  beacon: jest.fn(),
  fetchKeepAlive: jest.fn()
}))

let harvestInstance

beforeEach(() => {
  harvestInstance = new Harvest()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('sendX', () => {
  beforeEach(() => {
    jest.spyOn(submitDataModule, 'getSubmitMethod').mockReturnValue(jest.fn())
    jest.spyOn(harvestInstance, '_send').mockImplementation(jest.fn())
    jest.spyOn(harvestInstance, 'obfuscateAndSend').mockImplementation(jest.fn())
    jest.spyOn(harvestInstance, 'createPayload').mockReturnValue({})
  })

  test('should pass spec settings on to _send method', async () => {
    const endpoint = faker.datatype.uuid()
    const spec = {
      endpoint,
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }

    harvestInstance.sendX(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith(expect.objectContaining(spec))
  })

  test('should create payload with retry true', async () => {
    const endpoint = faker.datatype.uuid()
    const spec = {
      endpoint,
      opts: {
        unload: false
      }
    }
    jest.mocked(submitDataModule.getSubmitMethod).mockReturnValue(submitDataModule.xhr)

    harvestInstance.sendX(spec)

    expect(harvestInstance.createPayload).toHaveBeenCalledWith(spec.endpoint, { retry: true })
  })

  test('should not use obfuscateAndSend', async () => {
    harvestInstance.obfuscator = {
      shouldObfuscate: jest.fn().mockReturnValue(false)
    }

    const endpoint = faker.datatype.uuid()
    harvestInstance.sendX({ endpoint })

    expect(harvestInstance._send).toHaveBeenCalledWith({
      endpoint,
      payload: {},
      submitMethod: expect.any(Function)
    })
    expect(harvestInstance.obfuscateAndSend).not.toHaveBeenCalled()
  })

  test('should use obfuscateAndSend', async () => {
    harvestInstance.obfuscator = {
      shouldObfuscate: jest.fn().mockReturnValue(true)
    }

    const endpoint = faker.datatype.uuid()
    harvestInstance.sendX({ endpoint })

    expect(harvestInstance.obfuscateAndSend).toHaveBeenCalledWith({
      endpoint,
      payload: {},
      submitMethod: expect.any(Function)
    })
    expect(harvestInstance._send).not.toHaveBeenCalled()
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
    jest.spyOn(harvestInstance, 'obfuscateAndSend').mockImplementation(jest.fn())
  })

  test('should pass spec settings on to _send method', async () => {
    const endpoint = faker.datatype.uuid()
    const spec = {
      endpoint,
      [faker.datatype.uuid()]: faker.lorem.sentence()
    }

    harvestInstance.send(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith(expect.objectContaining(spec))
  })

  test('should not use obfuscateAndSend', async () => {
    harvestInstance.obfuscator = {
      shouldObfuscate: jest.fn().mockReturnValue(false)
    }

    const endpoint = faker.datatype.uuid()
    harvestInstance.send({ endpoint })

    expect(harvestInstance._send).toHaveBeenCalledWith({
      endpoint,
      payload: {
        body: {},
        qs: {}
      }
    })
    expect(harvestInstance.obfuscateAndSend).not.toHaveBeenCalled()
  })

  test('should use obfuscateAndSend', async () => {
    harvestInstance.obfuscator = {
      shouldObfuscate: jest.fn().mockReturnValue(true)
    }

    const endpoint = faker.datatype.uuid()
    harvestInstance.send({ endpoint })

    expect(harvestInstance.obfuscateAndSend).toHaveBeenCalledWith({
      endpoint,
      payload: {
        body: {},
        qs: {}
      }
    })
    expect(harvestInstance._send).not.toHaveBeenCalled()
  })

  test.each([undefined, {}])('should still call _send when spec is %s', async (spec) => {
    harvestInstance.send(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith({
      payload: {
        body: {},
        qs: {}
      }
    })
  })
})

describe('_send', () => {
  let errorBeacon
  let submitMethod
  let spec

  beforeEach(() => {
    errorBeacon = faker.internet.url()
    jest.mocked(configModule.getInfo).mockReturnValue({
      errorBeacon
    })
    jest.mocked(configModule.getRuntime).mockReturnValue({
      bytesSent: {},
      queryBytesSent: {},
      maxBytes: Infinity
    })

    spec = {
      endpoint: faker.datatype.uuid(),
      payload: {
        body: {},
        qs: {}
      },
      opts: {}
    }
    submitMethod = jest.fn()
    jest.spyOn(submitDataModule, 'getSubmitMethod').mockReturnValue(submitMethod)
  })

  test('should return false when info.errorBeacon is not defined', () => {
    jest.mocked(configModule.getInfo).mockReturnValue({})
    spec.opts.sendEmptyBody = true

    const result = harvestInstance._send(spec)

    expect(result).toEqual(false)
    expect(submitMethod).not.toHaveBeenCalled()
  })

  test('should return false when info.errorBeacon is not defined', () => {
    jest.mocked(submitMethod).mockReturnValue(true)
    spec.opts.sendEmptyBody = true

    const result = harvestInstance._send(spec)

    expect(result).toEqual(true)
    expect(submitMethod).toHaveBeenCalledWith({
      body: {},
      headers: [{ key: 'content-type', value: 'text/plain' }],
      sync: undefined,
      url: expect.stringContaining(errorBeacon)
    })
  })
})

describe('obfuscateAndSend', () => {
  beforeEach(() => {
    jest.spyOn(harvestInstance, '_send').mockImplementation(jest.fn())
  })

  test('should apply obfuscation to body and qs of payload', () => {
    const obfuscatedString = faker.datatype.uuid()
    harvestInstance.obfuscator = {
      obfuscateString: jest.fn().mockReturnValue(obfuscatedString)
    }

    const payload = {
      body: {
        foo: faker.lorem.sentence()
      },
      qs: {
        foo: faker.lorem.sentence()
      }
    }

    harvestInstance.obfuscateAndSend({ payload })

    expect(harvestInstance._send).toHaveBeenCalledWith({
      payload: {
        body: {
          foo: obfuscatedString
        },
        qs: {
          foo: obfuscatedString
        }
      }
    })
  })

  test('should skip obfuscation for qs.e param', () => {
    const obfuscatedString = faker.datatype.uuid()
    harvestInstance.obfuscator = {
      obfuscateString: jest.fn().mockReturnValue(obfuscatedString)
    }

    const payload = {
      qs: {
        e: faker.lorem.sentence()
      }
    }

    harvestInstance.obfuscateAndSend({ payload })

    expect(harvestInstance.obfuscator.obfuscateString).not.toHaveBeenCalled()
    expect(harvestInstance._send).toHaveBeenCalledWith({
      payload
    })
  })

  test.each([undefined, {}])('should still call _send when spec is %s', async (spec) => {
    harvestInstance.obfuscateAndSend(spec)

    expect(harvestInstance._send).toHaveBeenCalledWith({
      payload: {}
    })
  })
})

describe('baseQueryString', () => {
  beforeEach(() => {
    jest.mocked(configModule.getInfo).mockReturnValue({})
    jest.mocked(configModule.getRuntime).mockReturnValue({})
  })

  test('should construct a string of base query parameters', () => {
    const applicationID = faker.datatype.uuid()
    const sa = faker.datatype.uuid()
    jest.mocked(configModule.getInfo).mockReturnValue({
      applicationID,
      sa
    })
    const customTransaction = faker.datatype.uuid()
    const ptid = faker.datatype.uuid()
    jest.mocked(configModule.getRuntime).mockReturnValue({
      customTransaction,
      ptid
    })

    const results = harvestInstance.baseQueryString()

    expect(results).toContain(`a=${applicationID}`)
    expect(results).toContain(`&sa=${sa}`)
    expect(results).toMatch(/&v=\d{1,3}\.\d{1,3}\.\d{1,3}/)
    expect(results).toContain('&t=Unnamed%20Transaction')
    expect(results).toContain(`&ct=${customTransaction}`)
    expect(results).toMatch(/&rst=\d{1,9}/)
    expect(results).toContain('&ck=0')
    expect(results).toContain('&s=0')
    expect(results).toContain(`&ref=${location}`)
    expect(results).toContain(`&ptid=${ptid}`)
  })

  test('should set t param to info.tNamePlain', () => {
    const tNamePlain = faker.datatype.uuid()
    jest.mocked(configModule.getInfo).mockReturnValue({
      tNamePlain
    })

    const results = harvestInstance.baseQueryString()

    expect(results).toContain(`&t=${tNamePlain}`)
  })

  test('should set to param to info.transactionName and exclude t param', () => {
    const transactionName = faker.datatype.uuid()
    jest.mocked(configModule.getInfo).mockReturnValue({
      transactionName
    })

    const results = harvestInstance.baseQueryString()

    expect(results).not.toContain('&t=')
    expect(results).toContain(`&to=${transactionName}`)
  })

  test('should default sa to empty string', () => {
    const results = harvestInstance.baseQueryString()

    expect(results).not.toContain('&sa=')
  })

  test('should default s to 0', () => {
    const results = harvestInstance.baseQueryString()

    expect(results).toContain('&s=0')
  })

  test('should obfuscate ref', () => {
    const obfuscatedLocation = faker.datatype.uuid()
    harvestInstance.obfuscator = {
      shouldObfuscate: jest.fn().mockReturnValue(true),
      obfuscateString: jest.fn().mockReturnValue(obfuscatedLocation)
    }

    const results = harvestInstance.baseQueryString()

    expect(results).toContain(`&ref=${obfuscatedLocation}`)
  })

  test('should default ptid to empty string', () => {
    const results = harvestInstance.baseQueryString()

    expect(results).not.toContain('&ptid=')
  })
})

describe('createPayload', () => {
  test('should return empty body and qs values when no listeners exist', () => {
    const feature = faker.datatype.uuid()
    const results = harvestInstance.createPayload(feature)

    expect(results).toEqual({
      body: {},
      qs: {}
    })
  })

  test('should pass options to callback', () => {
    const feature = faker.datatype.uuid()
    const options = {
      [faker.datatype.uuid()]: faker.lorem.sentence()
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
    const feature = faker.datatype.uuid()
    const payloadA = {
      body: {
        [faker.datatype.uuid()]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      body: {
        [faker.datatype.uuid()]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
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
    const feature = faker.datatype.uuid()
    const payloadA = {
      qs: {
        [faker.datatype.uuid()]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      qs: {
        [faker.datatype.uuid()]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
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
    const feature = faker.datatype.uuid()
    const bodyProp = faker.datatype.uuid()
    const qsProp = faker.datatype.uuid()
    const payloadA = {
      body: {
        [bodyProp]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
        }
      },
      qs: {
        [qsProp]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
        }
      }
    }
    const payloadB = {
      body: {
        [bodyProp]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
        }
      },
      qs: {
        [qsProp]: {
          [faker.datatype.uuid()]: faker.lorem.sentence()
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

  test('should remove undefined properties from body and qs', () => {
    const feature = faker.datatype.uuid()
    const payload = {
      body: {
        foo: undefined,
        [faker.datatype.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: undefined,
        [faker.datatype.uuid()]: faker.lorem.sentence()
      }
    }
    const harvestCallback = jest.fn().mockReturnValue(payload)

    harvestInstance.on(feature, harvestCallback)
    const results = harvestInstance.createPayload(feature)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })

  test('should remove null properties from body and qs', () => {
    const feature = faker.datatype.uuid()
    const payload = {
      body: {
        foo: null,
        [faker.datatype.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: null,
        [faker.datatype.uuid()]: faker.lorem.sentence()
      }
    }
    const harvestCallback = jest.fn().mockReturnValue(payload)

    harvestInstance.on(feature, harvestCallback)
    const results = harvestInstance.createPayload(feature)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })

  test('should remove empty string properties from body and qs', () => {
    const feature = faker.datatype.uuid()
    const payload = {
      body: {
        foo: '',
        [faker.datatype.uuid()]: faker.lorem.sentence()
      },
      qs: {
        foo: '',
        [faker.datatype.uuid()]: faker.lorem.sentence()
      }
    }
    const harvestCallback = jest.fn().mockReturnValue(payload)

    harvestInstance.on(feature, harvestCallback)
    const results = harvestInstance.createPayload(feature)

    expect(Object.keys(results.body)).not.toContain('foo')
    expect(Object.keys(results.qs)).not.toContain('foo')
  })
})

// describe('sendX', () => {
//   test.each([null, undefined, false])('should not send request when body is empty and sendEmptyBody is %s', (sendEmptyBody) => {
//     const sendCallback = jest.fn()
//     const harvester = new Harvest()
//     harvester.on('jserrors', () => ({
//       body: {},
//       qs: {}
//     }))

//     harvester.sendX({ endpoint: 'jserrors', cbFinished: sendCallback })

//     expect(sendCallback).toHaveBeenCalledWith({ sent: false })
//     expect(submitData.xhr).not.toHaveBeenCalled()
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test('should send request when body is empty and sendEmptyBody is true', () => {
//     const harvester = new Harvest()
//     harvester.on('jserrors', () => ({
//       body: {},
//       qs: {}
//     }))

//     harvester.sendX({ endpoint: 'jserrors', opts: { sendEmptyBody: true }, cbFinished: jest.fn() })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining('https://example.com/jserrors/1/abcd?'),
//       body: undefined
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test.each([null, undefined, []])('should remove %s values from the body and query string when sending', (emptyValue) => {
//     const harvester = new Harvest()
//     harvester.on('jserrors', () => ({
//       body: { bar: 'foo', empty: emptyValue },
//       qs: { foo: 'bar', empty: emptyValue }
//     }))

//     harvester.sendX({ endpoint: 'jserrors', cbFinished: jest.fn() })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining('&foo=bar'),
//       body: JSON.stringify({ bar: 'foo' })
//     }))
//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.not.stringContaining('&empty'),
//       body: expect.not.stringContaining('empty')
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test.each([1, false, true])('should not remove value %s (when it doesn\'t have a length) from the body and query string when sending', (nonStringValue) => {
//     const harvester = new Harvest()
//     harvester.on('jserrors', () => ({
//       body: { bar: 'foo', nonString: nonStringValue },
//       qs: { foo: 'bar', nonString: nonStringValue }
//     }))

//     harvester.sendX({ endpoint: 'jserrors', cbFinished: jest.fn() })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining(`&nonString=${nonStringValue}`),
//       body: JSON.stringify({ bar: 'foo', nonString: nonStringValue })
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })
// })

// describe('send', () => {
//   test.each([null, undefined, false])('should not send request when body is empty and sendEmptyBody is %s', (sendEmptyBody) => {
//     const sendCallback = jest.fn()
//     const harvester = new Harvest()

//     harvester.send({ endpoint: 'rum', payload: { qs: {}, body: {} }, opts: { sendEmptyBody }, cbFinished: sendCallback })

//     expect(sendCallback).toHaveBeenCalledWith({ sent: false })
//     expect(submitData.xhr).not.toHaveBeenCalled()
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test('should send request when body is empty and sendEmptyBody is true', () => {
//     const harvester = new Harvest()

//     harvester.send({ endpoint: 'rum', payload: { qs: {}, body: {} }, opts: { sendEmptyBody: true } })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining('https://example.com/1/abcd?'),
//       body: undefined
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test.each([null, undefined, []])('should remove %s values from the body and query string when sending', (emptyValue) => {
//     const harvester = new Harvest()

//     harvester.send({
//       endpoint: 'rum',
//       payload: { qs: { foo: 'bar', empty: emptyValue }, body: { bar: 'foo', empty: emptyValue } }
//     })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining('&foo=bar'),
//       body: JSON.stringify({ bar: 'foo' })
//     }))
//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.not.stringContaining('&empty'),
//       body: expect.not.stringContaining('empty')
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })

//   test.each([1, false, true])('should not remove value %s (when it doesn\'t have a length) from the body and query string when sending', (nonStringValue) => {
//     const harvester = new Harvest()

//     harvester.send({
//       endpoint: 'rum',
//       payload: { qs: { foo: 'bar', nonString: nonStringValue }, body: { bar: 'foo', nonString: nonStringValue } }
//     })

//     expect(submitData.xhr).toHaveBeenCalledWith(expect.objectContaining({
//       url: expect.stringContaining(`&nonString=${nonStringValue}`),
//       body: JSON.stringify({ bar: 'foo', nonString: nonStringValue })
//     }))
//     expect(submitData.fetchKeepAlive).not.toHaveBeenCalled()
//     expect(submitData.beacon).not.toHaveBeenCalled()
//   })
// })
