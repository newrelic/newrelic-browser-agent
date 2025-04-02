import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../src/features/metrics/constants'
import { setAPI } from '../../src/loaders/api/api'
import * as drainModule from '../../src/common/drain/drain'
import * as runtimeModule from '../../src/common/constants/runtime'
import * as asyncApiModule from '../../src/loaders/api/apiAsync'
import * as windowLoadModule from '../../src/common/window/load'
import * as handleModule from '../../src/common/event-emitter/handle'

import { SR_EVENT_EMITTER_TYPES } from '../../src/features/session_replay/constants'
import { setupAgent } from './setup-agent'

let entityGuid
describe('setAPI', () => {
  let agent = setupAgent()

  beforeEach(async () => {
    console.debug = jest.fn()
    entityGuid = faker.string.uuid()
    jest.spyOn(handleModule, 'handle')
    jest.spyOn(agent.ee, 'emit')
  })

  afterEach(() => {
    agent.runtime.customTransaction = undefined
    jest.restoreAllMocks()
  })

  test('should add expected api methods returned object', () => {
    expect(typeof agent.setErrorHandler).toEqual('function')
    expect(typeof agent.finished).toEqual('function')
    expect(typeof agent.addToTrace).toEqual('function')
    expect(typeof agent.addRelease).toEqual('function')
    expect(typeof agent.addPageAction).toEqual('function')
    expect(typeof agent.recordCustomEvent).toEqual('function')
    expect(typeof agent.setCurrentRouteName).toEqual('function')
    expect(typeof agent.setPageViewName).toEqual('function')
    expect(typeof agent.setCustomAttribute).toEqual('function')
    expect(typeof agent.interaction).toEqual('function')
    expect(typeof agent.noticeError).toEqual('function')
    expect(typeof agent.setUserId).toEqual('function')
    expect(typeof agent.setApplicationVersion).toEqual('function')
    expect(typeof agent.start).toEqual('function')
    expect(typeof agent[SR_EVENT_EMITTER_TYPES.RECORD]).toEqual('function')
    expect(typeof agent[SR_EVENT_EMITTER_TYPES.PAUSE]).toEqual('function')
    expect(typeof agent.log).toEqual('function')
    expect(typeof agent.wrapLogger).toEqual('function')
    expect(typeof agent.register).toEqual('function')
  })

  test('should register api drain when not forced', () => {
    jest.spyOn(drainModule, 'registerDrain')

    setAPI(agent, false)

    expect(drainModule.registerDrain).toHaveBeenCalledTimes(1)
    expect(drainModule.registerDrain).toHaveBeenCalledWith(agent.agentIdentifier, 'api')
  })

  test('should immediately load the async APIs when not in a browser scope', async () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', false)
    jest.spyOn(asyncApiModule, 'setAsyncAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agent, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledWith(agent)
    expect(drainModule.drain).toHaveBeenCalledTimes(1)
    expect(drainModule.drain).toHaveBeenCalledWith(agent.agentIdentifier, 'api')
  })

  test('should wait to load the async APIs when in a browser scope', async () => {
    jest.spyOn(windowLoadModule, 'onWindowLoad').mockImplementation(() => {})
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)
    jest.spyOn(asyncApiModule, 'setAsyncAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agent, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).not.toHaveBeenCalled()
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledTimes(1)
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)

    const windowLoad = jest.mocked(windowLoadModule.onWindowLoad).mock.calls[0][0]
    windowLoad()
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledWith(agent)
    expect(drainModule.drain).toHaveBeenCalledTimes(1)
    expect(drainModule.drain).toHaveBeenCalledWith(agent.agentIdentifier, 'api')
  })

  test.each([
    { api: 'setErrorHandler', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'finished', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'addToTrace', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'addRelease', args: [faker.string.uuid(), faker.string.uuid()] }
  ])('should buffer calls to async API $api before the async APIs are loaded', async ({ api, args }) => {
    jest.spyOn(windowLoadModule, 'onWindowLoad').mockImplementation(() => {})
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)

    setAPI(agent, true)
    await new Promise(process.nextTick)

    agent[api](...args)

    expect(handleModule.handle).toHaveBeenCalledWith(
      SUPPORTABILITY_METRIC_CHANNEL,
      [`API/${api}/called`],
      undefined,
      FEATURE_NAMES.metrics,
      agent.ee
    )
    expect(handleModule.handle).toHaveBeenCalledWith(
      `api-${api}`,
      [expect.toBeNumber(), ...args],
      null,
      'api',
      agent.ee
    )
  })

  describe('addPageAction', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.addPageAction(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/addPageAction/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-addPageAction',
        [expect.toBeNumber(), ...args],
        null,
        FEATURE_NAMES.genericEvents,
        agent.ee
      )
    })
  })

  describe('setCurrentRouteName', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      setAPI(agent, true)
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.setCurrentRouteName(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/routeName/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-routeName',
        [expect.toBeNumber(), ...args],
        null,
        FEATURE_NAMES.spa,
        agent.ee
      )
    })
  })

  describe('setPageViewName', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.setPageViewName(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setPageViewName/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
    })

    test.each([null, undefined])('should return early when name is %s', (name) => {
      const args = [name, faker.string.uuid()]
      agent.setPageViewName(...args)

      expect(handleModule.handle).not.toHaveBeenCalled()
      expect(agent.runtime.customTransaction).toEqual(undefined)
    })

    test('should use a default host when one is not provided', () => {
      const args = [faker.string.uuid()]
      agent.setPageViewName(...args)

      expect(agent.runtime.customTransaction).toEqual(`http://custom.transaction/${args[0]}`)
    })

    test('should use the host provided', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.setPageViewName(...args)

      expect(agent.runtime.customTransaction).toEqual(`${args[1]}/${args[0]}`)
    })

    test('should not prepend name with slash when it is provided with one', () => {
      const args = ['/' + faker.string.uuid()]
      agent.setPageViewName(...args)

      expect(agent.runtime.customTransaction).toEqual(`http://custom.transaction${args[0]}`)
    })
  })

  describe('setCustomAttribute', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setCustomAttribute/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
    })

    test.each([null, undefined, {}, []])('should return early and warn when name is not a string (%s)', (name) => {
      const args = [name, faker.string.uuid()]
      agent.setCustomAttribute(...args)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#39'), typeof name)
    })

    test.each([undefined, {}, [], Symbol('foobar')])('should return early and warn when value is not a string, number, or null (%s)', (value) => {
      const args = [faker.string.uuid(), value]
      agent.setCustomAttribute(...args)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#40'), typeof value)
    })

    test('should set a custom attribute with a string value', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agent.setCustomAttribute(...args)

      expect(agent.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a number value', () => {
      const args = [faker.string.uuid(), faker.number.int()]
      agent.setCustomAttribute(...args)

      expect(agent.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a boolean value', () => {
      const args = [faker.string.uuid(), faker.datatype.boolean()]
      agent.setCustomAttribute(...args)

      expect(agent.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [faker.string.uuid(), null]
      agent.info = {
        ...(agent.info),
        jsAttributes: {
          [args[0]]: faker.string.uuid()
        }
      }
      agent.setCustomAttribute(...args)

      expect(agent.info.jsAttributes[args[0]]).toEqual(undefined)
    })

    test.each([
      null,
      faker.string.uuid()
    ])('should create session event emitter event when persisting value %s', (value) => {
      const args = [faker.string.uuid(), value, true]
      agent.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setCustomAttribute',
        [expect.toBeNumber(), args[0], args[1]],
        null,
        'session',
        agent.ee
      )
    })

    test('should always create session event emitter event when value is null and persistance argument is false', () => {
      const args = [faker.string.uuid(), null, false]
      agent.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setCustomAttribute',
        [expect.toBeNumber(), args[0], args[1]],
        null,
        'session',
        agent.ee
      )
    })
  })

  describe('setUserId', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should always persist the user id attribute', () => {
      const args = [faker.string.uuid()]
      agent.setUserId(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setUserId/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setUserId',
        [expect.toBeNumber(), 'enduser.id', ...args],
        null,
        'session',
        agent.ee
      )
    })

    test.each([123, undefined, {}, []])('should return early and warn when value is not a string or null (%s)', (value) => {
      agent.setUserId(value)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#41'), typeof value)
    })

    test('should set a custom attribute with name enduser.id', () => {
      const userId = faker.string.uuid()
      agent.setUserId(userId)

      expect(agent.info.jsAttributes['enduser.id']).toEqual(userId)
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      agent.info = {
        ...(agent.info),
        jsAttributes: {
          'enduser.id': faker.string.uuid()
        }
      }
      agent.setUserId(...args)

      expect(agent.info.jsAttributes['enduser.id']).toEqual(undefined)
    })
  })

  describe('setApplicationVersion', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      agent.setApplicationVersion(faker.string.uuid())

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setApplicationVersion/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
    })

    test.each([123, undefined, {}, []])('should return early and warn when value is not a string or null (%s)', (value) => {
      agent.setApplicationVersion(value)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#42'), typeof value)
    })

    test('should set a custom attribute with name application.version', () => {
      const args = [faker.string.uuid()]
      agent.setApplicationVersion(...args)

      expect(agent.info.jsAttributes['application.version']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      agent.info = {
        ...(agent.info),
        jsAttributes: {
          'application.version': faker.string.uuid()
        }
      }
      agent.setApplicationVersion(...args)

      expect(agent.info.jsAttributes['application.version']).toEqual(undefined)
    })
  })

  describe('start', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should create SM event emitter event for calls to API', () => {
      agent.start()

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/start/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
    })

    test('should emit event to start all features (if not auto)', () => {
      agent.start()
      expect(agent.ee.emit).toHaveBeenCalledWith('manual-start-all')
    })

    test('should emit start even if some arg is passed', () => {
      const badFeatureName = faker.string.uuid()
      agent.start(badFeatureName)

      expect(agent.ee.emit).toHaveBeenCalledWith('manual-start-all')
      expect(agent.ee.emit).not.toHaveBeenCalledWith(badFeatureName)
      expect(console.debug).not.toHaveBeenCalled()
    })
  })

  describe('noticeError', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      agent.noticeError(faker.string.uuid())

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/noticeError/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [expect.any(Error), expect.toBeNumber(), false, undefined, false],
        undefined,
        FEATURE_NAMES.jserrors,
        agent.ee
      )
    })

    test('should pass the error object as is when provided', () => {
      const args = [new Error(faker.string.uuid())]
      agent.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, undefined, false],
        undefined,
        FEATURE_NAMES.jserrors,
        agent.ee
      )
    })

    test('should pass the custom attributes object as is when provided', () => {
      const args = [new Error(faker.string.uuid()), {
        [faker.string.uuid()]: faker.string.uuid(),
        [faker.string.uuid()]: faker.string.uuid(),
        [faker.string.uuid()]: faker.string.uuid()
      }]
      agent.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, args[1], false],
        undefined,
        FEATURE_NAMES.jserrors,
        agent.ee
      )
    })
  })

  describe('register', () => {
    let licenseKey, applicationID
    let gotApiSendRumCall = false

    const expectHandle = (type, args, count = 1) => {
      expect(handleModule.handle.mock.calls.filter(call => {
        return call[0] === type && !!call[1].find(arg => arg === args)
      }).length).toEqual(count)
    }

    const expectApiSendRum = (val = true) => {
      expect(gotApiSendRumCall).toEqual(val)
    }

    beforeEach(async () => {
      licenseKey = faker.string.uuid()
      applicationID = faker.string.uuid()
      await new Promise(process.nextTick)
      const randomEntityGuid = faker.string.uuid()

      agent.ee.on('api-send-rum', () => {
        gotApiSendRumCall = true
        agent.runtime.entityManager.set(randomEntityGuid, { applicationID, licenseKey, entityGuid: randomEntityGuid })
        setTimeout(() => agent.ee.emit('entity-added', [{
          entityGuid: randomEntityGuid,
          applicationID,
          licenseKey
        }]), 100)
      })
    })
    afterEach(() => {
      gotApiSendRumCall = false
    })

    test('should return api object', async () => {
      const myApi = agent.register({ licenseKey, applicationID })

      expectApiSendRum()

      /** wait for entity guid to be assigned */
      myApi.metadata.connected.then(() => {
        expect(myApi).toMatchObject({
          noticeError: expect.any(Function),
          log: expect.any(Function),
          addPageAction: expect.any(Function),
          setCustomAttribute: expect.any(Function),
          setUserId: expect.any(Function),
          setApplicationVersion: expect.any(Function),
          metadata: {
            customAttributes: {},
            target: { licenseKey, applicationID, entityGuid },
            connected: expect.any(Promise)
          }
        })
      }).catch(() => {
        // should not have hit catch block
        expect(1).toEqual(2)
      })
    })

    ;[{ applicationID }, { licenseKey }].forEach(opts => {
      test('should warn and not work if invalid target', (done) => {
        let myApi = agent.register(opts)
        expectApiSendRum(false)
        expect(console.debug).toHaveBeenCalledWith('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#48', opts)
        myApi.addPageAction()
        myApi.noticeError()
        myApi.log()
        expect(console.debug).toHaveBeenCalledTimes(5)
        myApi.metadata.connected.then(() => {
          expect(1).toEqual(2) // should not get "then" here
        }).catch(() => {
          done()
        })
      })
    })

    test('should warn and not work if disabled', (done) => {
      agent.init.api.allow_registered_children = false
      let myApi = agent.register({ licenseKey, applicationID })
      expectApiSendRum(false)
      expect(console.debug.mock.calls.map(call => call[0]).some(tag => tag.includes('#54'))).toEqual(true)
      myApi.addPageAction()
      myApi.noticeError()
      myApi.log()
      expect(console.debug).toHaveBeenCalledTimes(5)
      agent.init.api.allow_registered_children = true

      myApi.metadata.connected.then(() => {
        expect(1).toEqual(2) // should not get "then" here
      }).catch(() => {
        done()
      })
    })

    test('should skip rum call if already registered', (done) => {
      // console.log('first', licenseKey, applicationID)
      let myApi = agent.register({ licenseKey, applicationID })

      myApi.metadata.connected.then((firstApi) => {
        expect(firstApi).toEqual(myApi)
        expectApiSendRum()
        gotApiSendRumCall = false

        let mySecondApiWithMatchingTarget = agent.register({ licenseKey, applicationID })

        mySecondApiWithMatchingTarget.metadata.connected.then((secondApi) => {
          expect(secondApi.metadata.entityGuid).toEqual(firstApi.metadata.entityGuid)
          expectApiSendRum(false)
          done()
        })
      })
    })

    test('should update custom attributes', () => {
      const myApi = agent.register({ licenseKey, applicationID, entityGuid })

      expectApiSendRum()

      myApi.setCustomAttribute('foo', 'bar')
      expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar' })

      myApi.setCustomAttribute('foo', 'bar2')
      expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2' })

      myApi.setApplicationVersion('appversion')
      expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2', 'application.version': 'appversion' })

      myApi.setUserId('userid')
      expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2', 'application.version': 'appversion', 'enduser.id': 'userid' })
    })

    test('should duplicate data with config - true', async () => {
      agent.init.api.duplicate_registered_data = true
      const target = { licenseKey, applicationID }
      const myApi = agent.register(target)

      expectApiSendRum()

      const customAttrs = { foo: 'bar' }

      myApi.log('test', { customAttributes: customAttrs })

      myApi.metadata.connected.catch(() => {
        // should not have hit catch block
        expect(1).toEqual(2)
      }).then(() => {
        expectHandle('storeSupportabilityMetrics', 'API/register/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/register/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/log/called', 2)
        expectHandle('storeSupportabilityMetrics', 'API/logging/info/called', 2)
        expectHandle('log', 'test', 2)

        agent.init.api.duplicate_registered_data = false
      })
    })

    test('should duplicate data with config - matching entity guid', async () => {
      agent.init.api.duplicate_registered_data = [entityGuid]
      const target = { licenseKey, applicationID }
      const myApi = agent.register(target)

      expectApiSendRum()

      const customAttrs = { foo: 'bar' }

      myApi.log('test', { customAttributes: customAttrs })

      myApi.metadata.connected.catch(() => {
        // should not have hit catch block
        expect(1).toEqual(2)
      }).then(() => {
        expectHandle('storeSupportabilityMetrics', 'API/register/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/register/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/log/called', 2)
        expectHandle('storeSupportabilityMetrics', 'API/logging/info/called', 2)
        expectHandle('log', 'test', 2)
      })

      agent.init.api.duplicate_registered_data = false
    })

    test('should NOT duplicate data with config - non-matching entity guid', async () => {
      agent.init.api.duplicate_registered_data = [faker.string.uuid()]
      const target = { licenseKey, applicationID }
      const myApi = agent.register(target)

      expectApiSendRum()

      const customAttrs = { foo: 'bar' }

      myApi.log('test', { customAttributes: customAttrs })

      myApi.metadata.connected.catch(() => {
        // should not have hit catch block
        expect(1).toEqual(2)
      }).then(() => {
        expectHandle('storeSupportabilityMetrics', 'API/register/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/register/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/logging/info/called', 1)
        expectHandle('log', 'test', 1)
      })

      agent.init.api.duplicate_registered_data = false
    })

    describe('noticeError', () => {
      test('should call base apis', async () => {
        const target = { licenseKey, applicationID }
        const myApi = agent.register(target)

        expectApiSendRum()

        const err = new Error('test')
        const customAttrs = { foo: 'bar' }

        myApi.noticeError(err, customAttrs)

        myApi.metadata.connected.catch(() => {
          // should not have hit catch block
          expect(1).toEqual(2)
        }).then(() => {
          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/noticeError/called')
          expectHandle('storeSupportabilityMetrics', 'API/noticeError/called')
          expectHandle('err', err)
        })
      })
    })

    describe('addPageAction', () => {
      test('should call base apis', async () => {
        const target = { licenseKey, applicationID }
        const myApi = agent.register(target)

        expectApiSendRum()

        const customAttrs = { foo: 'bar' }

        myApi.addPageAction('test', customAttrs)

        myApi.metadata.connected.catch(() => {
          // should not have hit catch block
          expect(1).toEqual(2)
        }).then(() => {
          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/addPageAction/called')
          expectHandle('storeSupportabilityMetrics', 'API/addPageAction/called')
          expectHandle('api-addPageAction', 'test')
        })
      })
    })

    describe('log', () => {
      test('should call base apis', async () => {
        const target = { licenseKey, applicationID }
        const myApi = agent.register(target)

        expectApiSendRum()

        const customAttrs = { foo: 'bar' }

        myApi.log('test', { customAttributes: customAttrs })

        myApi.metadata.connected.catch(() => {
          // should not have hit catch block
          expect(1).toEqual(2)
        }).then(() => {
          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/log/called')
          expectHandle('storeSupportabilityMetrics', 'API/log/called')
          expectHandle('storeSupportabilityMetrics', 'API/logging/info/called')
          expectHandle('log', 'test')
        })
      })
    })
  })

  describe('logging', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    describe('wrapLogger', () => {
      test('should emit events for calls by wrapped function - defaults', () => {
        const myLoggerPackage = {
          myObservedLogger: jest.fn(),
          myUnobservedLogger: jest.fn()
        }
        agent.wrapLogger(myLoggerPackage, 'myObservedLogger')

        /** emits data for observed fn */
        myLoggerPackage.myObservedLogger('test1')

        expect(myLoggerPackage.myObservedLogger).toHaveBeenCalled()

        expect(agent.ee.emit).toHaveBeenCalledTimes(4) // drain, wrapLogger SM, start, end

        const endEmit = agent.ee.emit.mock.calls.at(-1)
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('INFO')

        /** does NOT emit data for observed fn */
        myLoggerPackage.myUnobservedLogger('test1')

        expect(myLoggerPackage.myUnobservedLogger).toHaveBeenCalled()
        expect(agent.ee.emit).toHaveBeenCalledTimes(4) // still at 4 from last call
      })

      test('should emit events for calls by wrapped function - specified', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        agent.wrapLogger(myLoggerPackage, randomMethodName, { level: 'warn' })

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1')

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(agent.ee.emit).toHaveBeenCalledTimes(4) // drain, wrapLogger SM, start, end

        const endEmit = agent.ee.emit.mock.calls.at(-1)
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('warn')
      })

      test('should emit events with concat string for multiple args', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        agent.wrapLogger(myLoggerPackage, randomMethodName)

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1', { test2: 2 }, ['test3'], true, 1)

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(agent.ee.emit).toHaveBeenCalledTimes(4) // drain, wrapLogger SM, start, end

        const endEmit = agent.ee.emit.mock.calls.at(-1)
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1', { test2: 2 }, ['test3'], true, 1])
        expect(endEmit[2].level).toEqual('INFO')
      })

      test('wrapped function should still behave as intended', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn((arg) => arg + ' returned')
        }
        agent.wrapLogger(myLoggerPackage, randomMethodName)

        /** emits data for observed fn */
        const output = myLoggerPackage[randomMethodName]('test1')

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(output).toEqual('test1 returned')
      })

      test('should not emit events for same method twice', () => {
        const distinctMethodName = 'distinctMethodName'
        const myLoggerPackage = {
          [distinctMethodName]: jest.fn()
        }
        agent.wrapLogger(myLoggerPackage, distinctMethodName)

        myLoggerPackage[distinctMethodName]('test1')
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)

        /** Wrap again... BUT it should only emit an event once still */
        agent.wrapLogger(myLoggerPackage, distinctMethodName)
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)
      })
    })

    ;['error', 'trace', 'info', 'debug', 'info'].forEach(logMethod => {
      describe(logMethod, () => {
        test('should create event emitter event for calls to API', () => {
          const args = ['message', { customAttributes: { test: 1 }, level: logMethod }]
          agent.log(...args)

          expect(handleModule.handle).toHaveBeenCalledTimes(3)

          const firstEmit = handleModule.handle.mock.calls[0]
          expect(firstEmit[0]).toEqual(SUPPORTABILITY_METRIC_CHANNEL)
          expect(firstEmit[1]).toEqual(['API/log/called'])
          expect(firstEmit[2]).toBeUndefined()
          expect(firstEmit[3]).toEqual(FEATURE_NAMES.metrics)
          expect(firstEmit[4]).toEqual(agent.ee)

          const secondEmit = handleModule.handle.mock.calls[1]
          expect(secondEmit[0]).toEqual(SUPPORTABILITY_METRIC_CHANNEL)
          expect(secondEmit[1]).toEqual([`API/logging/${logMethod.toLowerCase().replace('log', '')}/called`])
          expect(secondEmit[2]).toBeUndefined()
          expect(secondEmit[3]).toEqual(FEATURE_NAMES.metrics)
          expect(secondEmit[4]).toEqual(agent.ee)

          const thirdEmit = handleModule.handle.mock.calls[2]
          expect(thirdEmit[0]).toEqual('log')
          expect(thirdEmit[1]).toEqual([expect.any(Number), args[0], args[1].customAttributes, logMethod.replace('log', '')])
          expect(thirdEmit[2]).toBeUndefined()
          expect(thirdEmit[3]).toEqual(FEATURE_NAMES.logging)
          expect(thirdEmit[4]).toEqual(agent.ee)
        })
      })
    })
  })

  describe('interaction', () => {
    beforeEach(async () => {
      setAPI(agent, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      agent.interaction()

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/get/called'],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-ixn-get',
        [expect.toBeNumber(), expect.any(Object)],
        expect.anything(),
        FEATURE_NAMES.spa,
        agent.ee
      )
    })

    test('should return an object containing the SPA interaction API methods', () => {
      const interaction = agent.interaction()

      expect(typeof interaction.actionText).toEqual('function')
      expect(typeof interaction.setName).toEqual('function')
      expect(typeof interaction.setAttribute).toEqual('function')
      expect(typeof interaction.save).toEqual('function')
      expect(typeof interaction.ignore).toEqual('function')
      expect(typeof interaction.onEnd).toEqual('function')
      expect(typeof interaction.getContext).toEqual('function')
      expect(typeof interaction.end).toEqual('function')
      expect(typeof interaction.createTracer).toEqual('function')
      expect(typeof interaction.get).toEqual('function')
    })

    test.each([
      { api: 'actionText', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'setName', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'setAttribute', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'save', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'ignore', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'onEnd', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'getContext', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'end', args: [faker.string.uuid(), faker.string.uuid()] },
      { api: 'get', args: [faker.string.uuid(), faker.string.uuid()] }
    ])('interaction instance API $api should create event emitter event for calls to API', ({ api, args }) => {
      const interaction = agent.interaction()
      interaction[api](...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        [`API/${api}/called`],
        undefined,
        FEATURE_NAMES.metrics,
        agent.ee
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        `api-ixn-${api}`,
        [expect.toBeNumber(), ...args],
        interaction,
        FEATURE_NAMES.spa,
        agent.ee
      )
    })

    describe('createTracer', () => {
      let interaction
      let tracerEE

      beforeEach(() => {
        interaction = agent.interaction()
        tracerEE = agent.ee.get('tracer')
        jest.spyOn(tracerEE, 'emit')
      })

      test('should not create supportability metric event emitter event', () => {
        const args = [faker.string.uuid(), jest.fn()]
        interaction.createTracer(...args)

        expect(handleModule.handle).not.toHaveBeenCalledWith(
          SUPPORTABILITY_METRIC_CHANNEL,
          ['API/tracer/called'],
          undefined,
          FEATURE_NAMES.metrics,
          agent.ee
        )
        expect(handleModule.handle).toHaveBeenCalledWith(
          'api-ixn-tracer',
          [expect.toBeNumber(), args[0], {}],
          interaction,
          FEATURE_NAMES.spa,
          agent.ee
        )
      })

      test('should only emit single event emitter event when no callback is provided', () => {
        const args = [faker.string.uuid()]
        const tracer = interaction.createTracer(...args)
        tracer()

        expect(tracerEE.emit).toHaveBeenCalledTimes(1)
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'no-fn-start',
          [expect.toBeNumber(), interaction, false],
          {}
        )
      })

      test('should emit start and end event emitter events when callback is provided', () => {
        const args = [faker.string.uuid(), jest.fn()]
        const tracer = interaction.createTracer(...args)

        const tracerArgs = [faker.string.uuid(), faker.string.uuid()]
        tracer(...tracerArgs)

        expect(tracerEE.emit).toHaveBeenCalledTimes(2)
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'fn-start',
          [expect.toBeNumber(), interaction, true],
          {}
        )
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'fn-end',
          [expect.toBeNumber()],
          {}
        )
        expect(args[1]).toHaveBeenCalledTimes(1)
        expect(args[1]).toHaveBeenCalledWith(...tracerArgs)
      })

      test('should emit error event emitter event when callback throws an error', () => {
        const testError = new Error(faker.lorem.sentence())
        const args = [faker.string.uuid(), jest.fn(() => { throw testError })]
        const tracer = interaction.createTracer(...args)

        const tracerArgs = [faker.string.uuid(), faker.string.uuid()]
        expect(() => tracer(...tracerArgs)).toThrow(testError)

        expect(tracerEE.emit).toHaveBeenCalledTimes(3)
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'fn-start',
          [expect.toBeNumber(), interaction, true],
          {}
        )
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'fn-err',
          [expect.objectContaining({ ...tracerArgs }), undefined, testError],
          {}
        )
        expect(tracerEE.emit).toHaveBeenCalledWith(
          'fn-end',
          [expect.toBeNumber()],
          {}
        )
        expect(args[1]).toHaveBeenCalledTimes(1)
        expect(args[1]).toHaveBeenCalledWith(...tracerArgs)
      })
    })
  })
})
