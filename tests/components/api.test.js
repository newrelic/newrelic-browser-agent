import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../src/features/metrics/constants'
import { setAPI } from '../../src/loaders/api/api'
import { setInfo, setConfiguration, setRuntime, getRuntime, getInfo } from '../../src/common/config/config'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import * as drainModule from '../../src/common/drain/drain'
import * as runtimeModule from '../../src/common/constants/runtime'
import * as asyncApiModule from '../../src/loaders/api/apiAsync'
import * as windowLoadModule from '../../src/common/window/load'
import * as handleModule from '../../src/common/event-emitter/handle'
import { SR_EVENT_EMITTER_TYPES } from '../../src/features/session_replay/constants'
import { logApiMethods } from '../../src/loaders/api/api-methods'

describe('setAPI', () => {
  let agentId
  let licenseKey
  let applicationID
  let instanceEE

  beforeEach(() => {
    agentId = faker.string.uuid()
    licenseKey = faker.string.uuid()
    applicationID = faker.string.uuid()

    setInfo(agentId, { licenseKey, applicationID })
    setConfiguration(agentId, {})
    setRuntime(agentId, {})

    console.warn = jest.fn()
    jest.spyOn(handleModule, 'handle')

    instanceEE = ee.get(agentId)
    jest.spyOn(instanceEE, 'emit')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should add expected api methods returned object', () => {
    const apiInterface = setAPI(agentId, true)

    expect(Object.keys(apiInterface).length).toEqual(21)
    expect(typeof apiInterface.setErrorHandler).toEqual('function')
    expect(typeof apiInterface.finished).toEqual('function')
    expect(typeof apiInterface.addToTrace).toEqual('function')
    expect(typeof apiInterface.addRelease).toEqual('function')
    expect(typeof apiInterface.addPageAction).toEqual('function')
    expect(typeof apiInterface.setCurrentRouteName).toEqual('function')
    expect(typeof apiInterface.setPageViewName).toEqual('function')
    expect(typeof apiInterface.setCustomAttribute).toEqual('function')
    expect(typeof apiInterface.interaction).toEqual('function')
    expect(typeof apiInterface.noticeError).toEqual('function')
    expect(typeof apiInterface.setUserId).toEqual('function')
    expect(typeof apiInterface.setApplicationVersion).toEqual('function')
    expect(typeof apiInterface.start).toEqual('function')
    expect(typeof apiInterface[SR_EVENT_EMITTER_TYPES.RECORD]).toEqual('function')
    expect(typeof apiInterface[SR_EVENT_EMITTER_TYPES.PAUSE]).toEqual('function')
    expect(typeof apiInterface.logError).toEqual('function')
    expect(typeof apiInterface.logInfo).toEqual('function')
    expect(typeof apiInterface.logWarn).toEqual('function')
    expect(typeof apiInterface.logDebug).toEqual('function')
    expect(typeof apiInterface.logTrace).toEqual('function')
    expect(typeof apiInterface.wrapLogger).toEqual('function')
  })

  test('should register api drain when not forced', () => {
    jest.spyOn(drainModule, 'registerDrain')

    setAPI(agentId, false)

    expect(drainModule.registerDrain).toHaveBeenCalledTimes(1)
    expect(drainModule.registerDrain).toHaveBeenCalledWith(agentId, 'api')
  })

  test('should immediately load the async APIs when not in a browser scope', async () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', false)
    jest.spyOn(asyncApiModule, 'setAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agentId, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAPI).toHaveBeenCalledWith(agentId)
    expect(drainModule.drain).toHaveBeenCalledTimes(1)
    expect(drainModule.drain).toHaveBeenCalledWith(agentId, 'api')
  })

  test('should wait to load the async APIs when in a browser scope', async () => {
    jest.spyOn(windowLoadModule, 'onWindowLoad').mockImplementation(() => {})
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)
    jest.spyOn(asyncApiModule, 'setAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agentId, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAPI).not.toHaveBeenCalled()
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledTimes(1)
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)

    const windowLoad = jest.mocked(windowLoadModule.onWindowLoad).mock.calls[0][0]
    windowLoad()
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAPI).toHaveBeenCalledWith(agentId)
    expect(drainModule.drain).toHaveBeenCalledTimes(1)
    expect(drainModule.drain).toHaveBeenCalledWith(agentId, 'api')
  })

  test.each([
    { api: 'setErrorHandler', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'finished', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'addToTrace', args: [faker.string.uuid(), faker.string.uuid()] },
    { api: 'addRelease', args: [faker.string.uuid(), faker.string.uuid()] }
  ])('should buffer calls to async API $api before the async APIs are loaded', async ({ api, args }) => {
    jest.spyOn(windowLoadModule, 'onWindowLoad').mockImplementation(() => {})
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)

    const apiInterface = setAPI(agentId, true)
    await new Promise(process.nextTick)

    apiInterface[api](...args)

    expect(handleModule.handle).toHaveBeenCalledTimes(2)
    expect(handleModule.handle).toHaveBeenCalledWith(
      SUPPORTABILITY_METRIC_CHANNEL,
      [`API/${api}/called`],
      undefined,
      FEATURE_NAMES.metrics,
      instanceEE
    )
    expect(handleModule.handle).toHaveBeenCalledWith(
      `api-${api}`,
      [expect.toBeNumber(), ...args],
      null,
      'api',
      instanceEE
    )
  })

  describe('addPageAction', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.addPageAction(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/addPageAction/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-addPageAction',
        [expect.toBeNumber(), ...args],
        null,
        FEATURE_NAMES.pageAction,
        instanceEE
      )
    })
  })

  describe('setCurrentRouteName', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.setCurrentRouteName(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/routeName/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-routeName',
        [expect.toBeNumber(), ...args],
        null,
        FEATURE_NAMES.spa,
        instanceEE
      )
    })
  })

  describe('setPageViewName', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.setPageViewName(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setPageViewName/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test.each([null, undefined])('should return early when name is %s', (name) => {
      const args = [name, faker.string.uuid()]
      apiInterface.setPageViewName(...args)

      expect(handleModule.handle).not.toHaveBeenCalled()
      expect(getRuntime(agentId).customTransaction).toEqual(undefined)
    })

    test('should use a default host when one is not provided', () => {
      const args = [faker.string.uuid()]
      apiInterface.setPageViewName(...args)

      expect(getRuntime(agentId).customTransaction).toEqual(`http://custom.transaction/${args[0]}`)
    })

    test('should use the host provided', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.setPageViewName(...args)

      expect(getRuntime(agentId).customTransaction).toEqual(`${args[1]}/${args[0]}`)
    })

    test('should not prepend name with slash when it is provided with one', () => {
      const args = ['/' + faker.string.uuid()]
      apiInterface.setPageViewName(...args)

      expect(getRuntime(agentId).customTransaction).toEqual(`http://custom.transaction${args[0]}`)
    })
  })

  describe('setCustomAttribute', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setCustomAttribute/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test.each([null, undefined, {}, []])('should return early and warn when name is not a string (%s)', (name) => {
      const args = [name, faker.string.uuid()]
      apiInterface.setCustomAttribute(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Name must be a string type'))
    })

    test.each([undefined, {}, [], Symbol('foobar')])('should return early and warn when value is not a string, number, or null (%s)', (value) => {
      const args = [faker.string.uuid(), value]
      apiInterface.setCustomAttribute(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Non-null value must be a string, number or boolean type'))
    })

    test('should set a custom attribute with a string value', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a number value', () => {
      const args = [faker.string.uuid(), faker.number.int()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a boolean value', () => {
      const args = [faker.string.uuid(), faker.datatype.boolean()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [faker.string.uuid(), null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          [args[0]]: faker.string.uuid()
        }
      })
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(undefined)
    })

    test.each([
      null,
      faker.string.uuid()
    ])('should create session event emitter event when persisting value %s', (value) => {
      const args = [faker.string.uuid(), value, true]
      apiInterface.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setCustomAttribute',
        [expect.toBeNumber(), args[0], args[1]],
        null,
        'session',
        instanceEE
      )
    })

    test('should always create session event emitter event when value is null and persistance argument is false', () => {
      const args = [faker.string.uuid(), null, false]
      apiInterface.setCustomAttribute(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setCustomAttribute',
        [expect.toBeNumber(), args[0], args[1]],
        null,
        'session',
        instanceEE
      )
    })
  })

  describe('setUserId', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should always persist the user id attribute', () => {
      const args = [faker.string.uuid()]
      apiInterface.setUserId(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setUserId/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-setUserId',
        [expect.toBeNumber(), 'enduser.id', ...args],
        null,
        'session',
        instanceEE
      )
    })

    test.each([123, undefined, {}, []])('should return early and warn when value is not a string or null (%s)', (value) => {
      const args = [value]
      apiInterface.setUserId(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Non-null value must be a string type'))
    })

    test('should set a custom attribute with name enduser.id', () => {
      const args = [faker.string.uuid()]
      apiInterface.setUserId(...args)

      expect(getInfo(agentId).jsAttributes['enduser.id']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          'enduser.id': faker.string.uuid()
        }
      })
      apiInterface.setUserId(...args)

      expect(getInfo(agentId).jsAttributes['enduser.id']).toEqual(undefined)
    })
  })

  describe('setApplicationVersion', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid()]
      apiInterface.setApplicationVersion(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/setApplicationVersion/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test.each([123, undefined, {}, []])('should return early and warn when value is not a string or null (%s)', (value) => {
      const args = [value]
      apiInterface.setApplicationVersion(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Expected <String | null>'))
    })

    test('should set a custom attribute with name application.version', () => {
      const args = [faker.string.uuid()]
      apiInterface.setApplicationVersion(...args)

      expect(getInfo(agentId).jsAttributes['application.version']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          'application.version': faker.string.uuid()
        }
      })
      apiInterface.setApplicationVersion(...args)

      expect(getInfo(agentId).jsAttributes['application.version']).toEqual(undefined)
    })
  })

  describe('start', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create SM event emitter event for calls to API', () => {
      apiInterface.start()

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/start/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test('should emit event to start all features (if not auto)', () => {
      apiInterface.start()
      expect(instanceEE.emit).toHaveBeenCalledWith('manual-start-all')
    })

    test('should emit start even if some arg is passed', () => {
      const badFeatureName = faker.string.uuid()
      apiInterface.start(badFeatureName)

      expect(instanceEE.emit).toHaveBeenCalledWith('manual-start-all')
      expect(instanceEE.emit).not.toHaveBeenCalledWith(badFeatureName)
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('noticeError', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      const args = [faker.string.uuid()]
      apiInterface.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/noticeError/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [expect.any(Error), expect.toBeNumber(), false, undefined, false],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
    })

    test('should pass the error object as is when provided', () => {
      const args = [new Error(faker.string.uuid())]
      apiInterface.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, undefined, false],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
    })

    test('should pass the custom attributes object as is when provided', () => {
      const args = [new Error(faker.string.uuid()), {
        [faker.string.uuid()]: faker.string.uuid(),
        [faker.string.uuid()]: faker.string.uuid(),
        [faker.string.uuid()]: faker.string.uuid()
      }]
      apiInterface.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, args[1], false],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
    })
  })

  describe('logging', () => {
    let apiInterface
    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })
    describe('wrapLogger', () => {
      test('should emit events for calls by wrapped function - defaults', () => {
        const myLoggerPackage = {
          myObservedLogger: jest.fn(),
          myUnobservedLogger: jest.fn()
        }
        apiInterface.wrapLogger(myLoggerPackage, 'myObservedLogger')

        /** emits data for observed fn */
        myLoggerPackage.myObservedLogger('test1')

        expect(myLoggerPackage.myObservedLogger).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(3) // drain, start, end

        const endEmit = instanceEE.emit.mock.calls[2]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('info')

        /** does NOT emit data for observed fn */
        myLoggerPackage.myUnobservedLogger('test1')

        expect(myLoggerPackage.myUnobservedLogger).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(3) // still at 3 from last call
      })

      test('should emit events for calls by wrapped function - specified', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        apiInterface.wrapLogger(myLoggerPackage, randomMethodName, 'warn')

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1')

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(3) // drain, start, end

        const endEmit = instanceEE.emit.mock.calls[2]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('warn')
      })

      test('should emit events with concat string for multiple args', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        apiInterface.wrapLogger(myLoggerPackage, randomMethodName)

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1', { test2: 2 }, ['test3'], true, 1)

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(3) // drain, start, end

        const endEmit = instanceEE.emit.mock.calls[2]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1', { test2: 2 }, ['test3'], true, 1])
        expect(endEmit[2].level).toEqual('info')
      })

      test('wrapped function should still behave as intended', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn((arg) => arg + ' returned')
        }
        apiInterface.wrapLogger(myLoggerPackage, randomMethodName)

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
        apiInterface.wrapLogger(myLoggerPackage, distinctMethodName)

        myLoggerPackage[distinctMethodName]('test1')
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)

        /** Wrap again... BUT it should only emit an event once still */
        apiInterface.wrapLogger(myLoggerPackage, distinctMethodName)
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)
      })
    })

    logApiMethods.forEach(logMethod => {
      describe(logMethod, () => {
        test('should create event emitter event for calls to API', () => {
          const args = [faker.string.uuid(), { [faker.string.uuid()]: faker.string.uuid() }]
          apiInterface[logMethod](...args)

          expect(handleModule.handle).toHaveBeenCalledTimes(2)

          const firstEmit = handleModule.handle.mock.calls[0]
          expect(firstEmit[0]).toEqual(SUPPORTABILITY_METRIC_CHANNEL)
          expect(firstEmit[1]).toEqual([`API/logging/${logMethod.toLowerCase().replace('log', '')}/called`])
          expect(firstEmit[2]).toBeUndefined()
          expect(firstEmit[3]).toEqual(FEATURE_NAMES.metrics)
          expect(firstEmit[4]).toEqual(instanceEE)

          const secondEmit = handleModule.handle.mock.calls[1]
          expect(secondEmit[0]).toEqual('log')
          expect(secondEmit[1]).toEqual([expect.any(Number), ...args, logMethod.toLowerCase().replace('log', '')])
          expect(secondEmit[2]).toBeUndefined()
          expect(secondEmit[3]).toEqual(FEATURE_NAMES.logging)
          expect(secondEmit[4]).toEqual(instanceEE)
        })
      })
    })
  })

  describe('interaction', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      apiInterface.interaction()

      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/get/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-ixn-get',
        [expect.toBeNumber(), expect.any(Object)],
        expect.anything(),
        FEATURE_NAMES.spa,
        instanceEE
      )
    })

    test('should return an object containing the SPA interaction API methods', () => {
      const interaction = apiInterface.interaction()

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
      const interaction = apiInterface.interaction()
      interaction[api](...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        [`API/${api}/called`],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        `api-ixn-${api}`,
        [expect.toBeNumber(), ...args],
        interaction,
        FEATURE_NAMES.spa,
        instanceEE
      )
    })

    describe('createTracer', () => {
      let interaction
      let tracerEE

      beforeEach(() => {
        interaction = apiInterface.interaction()
        tracerEE = instanceEE.get('tracer')
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
          instanceEE
        )
        expect(handleModule.handle).toHaveBeenCalledWith(
          'api-ixn-tracer',
          [expect.toBeNumber(), args[0], {}],
          interaction,
          FEATURE_NAMES.spa,
          instanceEE
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
