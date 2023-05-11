import { faker } from '@faker-js/faker'
import { submitData } from '../util/submit-data'
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
  submitData: {
    xhr: jest.fn(() => ({
      addEventListener: jest.fn()
    })),
    beacon: jest.fn(),
    img: jest.fn()
  }
}))

describe('sendX', () => {
  test.each([null, undefined, false])('should not send request when body is empty and sendEmptyBody is %s', (sendEmptyBody) => {
    const sendCallback = jest.fn()
    const harvester = new Harvest()
    harvester.on('jserrors', () => ({
      body: {},
      qs: {}
    }))

    harvester.sendX('jserrors', { sendEmptyBody }, sendCallback)

    expect(sendCallback).toHaveBeenCalledWith({ sent: false })
    expect(submitData.xhr).not.toHaveBeenCalled()
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test('should send request when body is empty and sendEmptyBody is true', () => {
    const harvester = new Harvest()
    harvester.on('jserrors', () => ({
      body: {},
      qs: {}
    }))

    harvester.sendX('jserrors', { sendEmptyBody: true }, jest.fn())

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/jserrors/1/abcd?'),
      undefined,
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test.each([null, undefined, []])('should remove %s values from the body and query string when sending', (emptyValue) => {
    const harvester = new Harvest()
    harvester.on('jserrors', () => ({
      body: { bar: 'foo', empty: emptyValue },
      qs: { foo: 'bar', empty: emptyValue }
    }))

    harvester.sendX('jserrors', {}, jest.fn())

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining('&foo=bar'),
      JSON.stringify({ bar: 'foo' }),
      undefined
    )
    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.not.stringContaining('&empty'),
      expect.not.stringContaining('empty'),
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test.each([1, false, true])('should not remove value %s (when it doesn\'t have a length) from the body and query string when sending', (nonStringValue) => {
    const harvester = new Harvest()
    harvester.on('jserrors', () => ({
      body: { bar: 'foo', nonString: nonStringValue },
      qs: { foo: 'bar', nonString: nonStringValue }
    }))

    harvester.sendX('jserrors', {}, jest.fn())

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining(`&nonString=${nonStringValue}`),
      JSON.stringify({ bar: 'foo', nonString: nonStringValue }),
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })
})

describe('send', () => {
  test.each([null, undefined, false])('should not send request when body is empty and sendEmptyBody is %s', (sendEmptyBody) => {
    const sendCallback = jest.fn()
    const harvester = new Harvest()

    harvester.send('rum', { qs: {}, body: {} }, { sendEmptyBody }, null, sendCallback)

    expect(sendCallback).toHaveBeenCalledWith({ sent: false })
    expect(submitData.xhr).not.toHaveBeenCalled()
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test('should send request when body is empty and sendEmptyBody is true', () => {
    const harvester = new Harvest()

    harvester.send('rum', { qs: {}, body: {} }, { sendEmptyBody: true })

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/1/abcd?'),
      undefined,
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test.each([null, undefined, []])('should remove %s values from the body and query string when sending', (emptyValue) => {
    const harvester = new Harvest()

    harvester.send(
      'rum',
      { qs: { foo: 'bar', empty: emptyValue }, body: { bar: 'foo', empty: emptyValue } }
    )

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining('&foo=bar'),
      JSON.stringify({ bar: 'foo' }),
      undefined
    )
    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.not.stringContaining('&empty'),
      expect.not.stringContaining('empty'),
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })

  test.each([1, false, true])('should not remove value %s (when it doesn\'t have a length) from the body and query string when sending', (nonStringValue) => {
    const harvester = new Harvest()

    harvester.send(
      'rum',
      { qs: { foo: 'bar', nonString: nonStringValue }, body: { bar: 'foo', nonString: nonStringValue } }
    )

    expect(submitData.xhr).toHaveBeenCalledWith(
      expect.stringContaining(`&nonString=${nonStringValue}`),
      JSON.stringify({ bar: 'foo', nonString: nonStringValue }),
      undefined
    )
    expect(submitData.img).not.toHaveBeenCalled()
    expect(submitData.beacon).not.toHaveBeenCalled()
  })
})
