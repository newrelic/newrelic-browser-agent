import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../src/features/metrics/constants'
import { setAPI } from '../../src/loaders/api/api'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import * as drainModule from '../../src/common/drain/drain'
import * as runtimeModule from '../../src/common/constants/runtime'
import * as asyncApiModule from '../../src/loaders/api/apiAsync'
import * as windowLoadModule from '../../src/common/window/load'
import * as handleModule from '../../src/common/event-emitter/handle'
import { SR_EVENT_EMITTER_TYPES } from '../../src/features/session_replay/constants'

describe('setAPI', () => {
  let agentId
  let instanceEE
  let agentInst

  beforeEach(() => {
    agentId = faker.string.uuid()

    console.debug = jest.fn()
    jest.spyOn(handleModule, 'handle')

    instanceEE = ee.get(agentId)
    jest.spyOn(instanceEE, 'emit')

    agentInst = {
      agentIdentifier: agentId,
      ee: instanceEE,
      info: { jsAttributes: {} },
      runtime: {}
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should add expected api methods returned object', () => {
    const numProperties = Object.keys(agentInst).length
    setAPI(agentInst, true)

    expect(Object.keys(agentInst).length - numProperties).toEqual(18)
    expect(typeof agentInst.setErrorHandler).toEqual('function')
    expect(typeof agentInst.finished).toEqual('function')
    expect(typeof agentInst.addToTrace).toEqual('function')
    expect(typeof agentInst.addRelease).toEqual('function')
    expect(typeof agentInst.addPageAction).toEqual('function')
    expect(typeof agentInst.recordCustomEvent).toEqual('function')
    expect(typeof agentInst.setCurrentRouteName).toEqual('function')
    expect(typeof agentInst.setPageViewName).toEqual('function')
    expect(typeof agentInst.setCustomAttribute).toEqual('function')
    expect(typeof agentInst.interaction).toEqual('function')
    expect(typeof agentInst.noticeError).toEqual('function')
    expect(typeof agentInst.setUserId).toEqual('function')
    expect(typeof agentInst.setApplicationVersion).toEqual('function')
    expect(typeof agentInst.start).toEqual('function')
    expect(typeof agentInst[SR_EVENT_EMITTER_TYPES.RECORD]).toEqual('function')
    expect(typeof agentInst[SR_EVENT_EMITTER_TYPES.PAUSE]).toEqual('function')
    expect(typeof agentInst.log).toEqual('function')
    expect(typeof agentInst.wrapLogger).toEqual('function')
  })

  test('should register api drain when not forced', () => {
    jest.spyOn(drainModule, 'registerDrain')

    setAPI(agentInst, false)

    expect(drainModule.registerDrain).toHaveBeenCalledTimes(1)
    expect(drainModule.registerDrain).toHaveBeenCalledWith(agentId, 'api')
  })

  test('should immediately load the async APIs when not in a browser scope', async () => {
    jest.replaceProperty(runtimeModule, 'isBrowserScope', false)
    jest.spyOn(asyncApiModule, 'setAsyncAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agentInst, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledWith(agentInst)
    expect(drainModule.drain).toHaveBeenCalledTimes(1)
    expect(drainModule.drain).toHaveBeenCalledWith(agentId, 'api')
  })

  test('should wait to load the async APIs when in a browser scope', async () => {
    jest.spyOn(windowLoadModule, 'onWindowLoad').mockImplementation(() => {})
    jest.replaceProperty(runtimeModule, 'isBrowserScope', true)
    jest.spyOn(asyncApiModule, 'setAsyncAPI')
    jest.spyOn(drainModule, 'drain')

    setAPI(agentInst, true)
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).not.toHaveBeenCalled()
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledTimes(1)
    expect(windowLoadModule.onWindowLoad).toHaveBeenCalledWith(expect.any(Function), true)

    const windowLoad = jest.mocked(windowLoadModule.onWindowLoad).mock.calls[0][0]
    windowLoad()
    await new Promise(process.nextTick)

    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledTimes(1)
    expect(asyncApiModule.setAsyncAPI).toHaveBeenCalledWith(agentInst)
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

    setAPI(agentInst, true)
    await new Promise(process.nextTick)

    agentInst[api](...args)

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
    test('should create event emitter event for calls to API', () => {
      setAPI(agentInst, true)

      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.addPageAction(...args)

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
        FEATURE_NAMES.genericEvents,
        instanceEE
      )
    })
  })

  describe('setCurrentRouteName', () => {
    test('should create event emitter event for calls to API', () => {
      setAPI(agentInst, true)
      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.setCurrentRouteName(...args)

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
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.setPageViewName(...args)

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
      agentInst.setPageViewName(...args)

      expect(handleModule.handle).not.toHaveBeenCalled()
      expect(agentInst.runtime.customTransaction).toEqual(undefined)
    })

    test('should use a default host when one is not provided', () => {
      const args = [faker.string.uuid()]
      agentInst.setPageViewName(...args)

      expect(agentInst.runtime.customTransaction).toEqual(`http://custom.transaction/${args[0]}`)
    })

    test('should use the host provided', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.setPageViewName(...args)

      expect(agentInst.runtime.customTransaction).toEqual(`${args[1]}/${args[0]}`)
    })

    test('should not prepend name with slash when it is provided with one', () => {
      const args = ['/' + faker.string.uuid()]
      agentInst.setPageViewName(...args)

      expect(agentInst.runtime.customTransaction).toEqual(`http://custom.transaction${args[0]}`)
    })
  })

  describe('setCustomAttribute', () => {
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should only create SM event emitter event for calls to API', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.setCustomAttribute(...args)

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
      agentInst.setCustomAttribute(...args)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#39'), typeof name)
    })

    test.each([undefined, {}, [], Symbol('foobar')])('should return early and warn when value is not a string, number, or null (%s)', (value) => {
      const args = [faker.string.uuid(), value]
      agentInst.setCustomAttribute(...args)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#40'), typeof value)
    })

    test('should set a custom attribute with a string value', () => {
      const args = [faker.string.uuid(), faker.string.uuid()]
      agentInst.setCustomAttribute(...args)

      expect(agentInst.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a number value', () => {
      const args = [faker.string.uuid(), faker.number.int()]
      agentInst.setCustomAttribute(...args)

      expect(agentInst.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a boolean value', () => {
      const args = [faker.string.uuid(), faker.datatype.boolean()]
      agentInst.setCustomAttribute(...args)

      expect(agentInst.info.jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [faker.string.uuid(), null]
      agentInst.info.jsAttributes = {
        [args[0]]: faker.string.uuid()
      }
      agentInst.setCustomAttribute(...args)

      expect(agentInst.info.jsAttributes[args[0]]).toEqual(undefined)
    })

    test.each([
      null,
      faker.string.uuid()
    ])('should create session event emitter event when persisting value %s', (value) => {
      const args = [faker.string.uuid(), value, true]
      agentInst.setCustomAttribute(...args)

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
      agentInst.setCustomAttribute(...args)

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
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should always persist the user id attribute', () => {
      const args = [faker.string.uuid()]
      agentInst.setUserId(...args)

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
      agentInst.setUserId(value)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#41'), typeof value)
    })

    test('should set a custom attribute with name enduser.id', () => {
      const userId = faker.string.uuid()
      agentInst.setUserId(userId)

      expect(agentInst.info.jsAttributes['enduser.id']).toEqual(userId)
    })

    test('should delete custom attribute when value is null', () => {
      agentInst.info.jsAttributes = {
        'enduser.id': faker.string.uuid()
      }
      agentInst.setUserId(null)

      expect(agentInst.info.jsAttributes['enduser.id']).toEqual(undefined)
    })
  })

  describe('setApplicationVersion', () => {
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should only create SM event emitter event for calls to API', () => {
      agentInst.setApplicationVersion(faker.string.uuid())

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
      agentInst.setApplicationVersion(value)

      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#42'), typeof value)
    })

    test('should set a custom attribute with name application.version', () => {
      const args = [faker.string.uuid()]
      agentInst.setApplicationVersion(...args)

      expect(agentInst.info.jsAttributes['application.version']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      agentInst.info.jsAttributes = {
        'application.version': faker.string.uuid()
      }
      agentInst.setApplicationVersion(null)

      expect(agentInst.info.jsAttributes['application.version']).toEqual(undefined)
    })
  })

  describe('start', () => {
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should create SM event emitter event for calls to API', () => {
      agentInst.start()

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
      agentInst.start()
      expect(instanceEE.emit).toHaveBeenCalledWith('manual-start-all')
    })

    test('should emit start even if some arg is passed', () => {
      const badFeatureName = faker.string.uuid()
      agentInst.start(badFeatureName)

      expect(instanceEE.emit).toHaveBeenCalledWith('manual-start-all')
      expect(instanceEE.emit).not.toHaveBeenCalledWith(badFeatureName)
      expect(console.debug).not.toHaveBeenCalled()
    })
  })

  describe('noticeError', () => {
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should create event emitter event for calls to API', () => {
      agentInst.noticeError(faker.string.uuid())

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
      agentInst.noticeError(...args)

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
      agentInst.noticeError(...args)

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
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    describe('wrapLogger', () => {
      test('should emit events for calls by wrapped function - defaults', () => {
        const myLoggerPackage = {
          myObservedLogger: jest.fn(),
          myUnobservedLogger: jest.fn()
        }
        agentInst.wrapLogger(myLoggerPackage, 'myObservedLogger')

        /** emits data for observed fn */
        myLoggerPackage.myObservedLogger('test1')

        expect(myLoggerPackage.myObservedLogger).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(4) // drain, start, end, SM

        const endEmit = instanceEE.emit.mock.calls[3]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('INFO')

        /** does NOT emit data for observed fn */
        myLoggerPackage.myUnobservedLogger('test1')

        expect(myLoggerPackage.myUnobservedLogger).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(4) // still at 4 from last call
      })

      test('should emit events for calls by wrapped function - specified', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        agentInst.wrapLogger(myLoggerPackage, randomMethodName, { level: 'warn' })

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1')

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(4) // drain, start, end, SM

        const endEmit = instanceEE.emit.mock.calls[3]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1'])
        expect(endEmit[2].level).toEqual('warn')
      })

      test('should emit events with concat string for multiple args', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn()
        }
        agentInst.wrapLogger(myLoggerPackage, randomMethodName)

        /** emits data for observed fn */
        myLoggerPackage[randomMethodName]('test1', { test2: 2 }, ['test3'], true, 1)

        expect(myLoggerPackage[randomMethodName]).toHaveBeenCalled()
        expect(instanceEE.emit).toHaveBeenCalledTimes(4) // drain, start, end, SM

        const endEmit = instanceEE.emit.mock.calls[3]
        expect(endEmit[0]).toEqual('wrap-logger-end')
        expect(endEmit[1][0]).toEqual(['test1', { test2: 2 }, ['test3'], true, 1])
        expect(endEmit[2].level).toEqual('INFO')
      })

      test('wrapped function should still behave as intended', () => {
        const randomMethodName = faker.string.uuid()
        const myLoggerPackage = {
          [randomMethodName]: jest.fn((arg) => arg + ' returned')
        }
        agentInst.wrapLogger(myLoggerPackage, randomMethodName)

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
        agentInst.wrapLogger(myLoggerPackage, distinctMethodName)

        myLoggerPackage[distinctMethodName]('test1')
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)

        /** Wrap again... BUT it should only emit an event once still */
        agentInst.wrapLogger(myLoggerPackage, distinctMethodName)
        expect(myLoggerPackage[distinctMethodName]).toHaveBeenCalledTimes(1)
      })
    })

    ;['error', 'trace', 'info', 'debug', 'info'].forEach(logMethod => {
      describe(logMethod, () => {
        test('should create event emitter event for calls to API', () => {
          const args = ['message', { customAttributes: { test: 1 }, level: logMethod }]
          agentInst.log(...args)

          expect(handleModule.handle).toHaveBeenCalledTimes(3)

          const firstEmit = handleModule.handle.mock.calls[0]
          expect(firstEmit[0]).toEqual(SUPPORTABILITY_METRIC_CHANNEL)
          expect(firstEmit[1]).toEqual(['API/log/called'])
          expect(firstEmit[2]).toBeUndefined()
          expect(firstEmit[3]).toEqual(FEATURE_NAMES.metrics)
          expect(firstEmit[4]).toEqual(instanceEE)

          const secondEmit = handleModule.handle.mock.calls[1]
          expect(secondEmit[0]).toEqual(SUPPORTABILITY_METRIC_CHANNEL)
          expect(secondEmit[1]).toEqual([`API/logging/${logMethod.toLowerCase().replace('log', '')}/called`])
          expect(secondEmit[2]).toBeUndefined()
          expect(secondEmit[3]).toEqual(FEATURE_NAMES.metrics)
          expect(secondEmit[4]).toEqual(instanceEE)

          const thirdEmit = handleModule.handle.mock.calls[2]
          expect(thirdEmit[0]).toEqual('log')
          expect(thirdEmit[1]).toEqual([expect.any(Number), args[0], args[1].customAttributes, logMethod.replace('log', '')])
          expect(thirdEmit[2]).toBeUndefined()
          expect(thirdEmit[3]).toEqual(FEATURE_NAMES.logging)
          expect(thirdEmit[4]).toEqual(instanceEE)
        })
      })
    })
  })

  describe('interaction', () => {
    beforeEach(() => {
      setAPI(agentInst, true)
    })

    test('should create event emitter event for calls to API', () => {
      agentInst.interaction()

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
      const interaction = agentInst.interaction()

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
      const interaction = agentInst.interaction()
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
        interaction = agentInst.interaction()
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
