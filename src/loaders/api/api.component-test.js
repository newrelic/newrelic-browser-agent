import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../features/features'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../features/metrics/constants'
import { setAPI } from './api'
import { setInfo, setConfiguration, setRuntime, getRuntime, getInfo } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import * as drainModule from '../../common/drain/drain'
import * as runtimeModule from '../../common/constants/runtime'
import * as asyncApiModule from './apiAsync'
import * as windowLoadModule from '../../common/window/load'
import * as handleModule from '../../common/event-emitter/handle'

describe('setAPI', () => {
  let agentId
  let licenseKey
  let applicationID
  let instanceEE

  beforeEach(() => {
    agentId = faker.datatype.uuid()
    licenseKey = faker.datatype.uuid()
    applicationID = faker.datatype.uuid()

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

    expect(Object.keys(apiInterface).length).toEqual(15)
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
    expect(typeof apiInterface.recordReplay).toEqual('function')
    expect(typeof apiInterface.pauseReplay).toEqual('function')
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
    { api: 'setErrorHandler', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
    { api: 'finished', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
    { api: 'addToTrace', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
    { api: 'addRelease', args: [faker.datatype.uuid(), faker.datatype.uuid()] }
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
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
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
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
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
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
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
      const args = [name, faker.datatype.uuid()]
      apiInterface.setPageViewName(...args)

      expect(handleModule.handle).not.toHaveBeenCalled()
      expect(getRuntime(agentId).customTransaction).toEqual(undefined)
    })

    test('should use a default host when one is not provided', () => {
      const args = [faker.datatype.uuid()]
      apiInterface.setPageViewName(...args)

      expect(getRuntime(agentId).customTransaction).toEqual(`http://custom.transaction/${args[0]}`)
    })

    test('should use the host provided', () => {
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
      apiInterface.setPageViewName(...args)

      expect(getRuntime(agentId).customTransaction).toEqual(`${args[1]}/${args[0]}`)
    })

    test('should not prepend name with slash when it is provided with one', () => {
      const args = ['/' + faker.datatype.uuid()]
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
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
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
      const args = [name, faker.datatype.uuid()]
      apiInterface.setCustomAttribute(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Name must be a string type'))
    })

    test.each([undefined, {}, [], Symbol('foobar')])('should return early and warn when value is not a string, number, or null (%s)', (value) => {
      const args = [faker.datatype.uuid(), value]
      apiInterface.setCustomAttribute(...args)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Non-null value must be a string, number or boolean type'))
    })

    test('should set a custom attribute with a string value', () => {
      const args = [faker.datatype.uuid(), faker.datatype.uuid()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a number value', () => {
      const args = [faker.datatype.uuid(), faker.datatype.number()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should set a custom attribute with a boolean value', () => {
      const args = [faker.datatype.uuid(), faker.datatype.boolean()]
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(args[1])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [faker.datatype.uuid(), null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          [args[0]]: faker.datatype.uuid()
        }
      })
      apiInterface.setCustomAttribute(...args)

      expect(getInfo(agentId).jsAttributes[args[0]]).toEqual(undefined)
    })

    test.each([
      null,
      faker.datatype.uuid()
    ])('should create session event emitter event when persisting value %s', (value) => {
      const args = [faker.datatype.uuid(), value, true]
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
      const args = [faker.datatype.uuid(), null, false]
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
      const args = [faker.datatype.uuid()]
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
      const args = [faker.datatype.uuid()]
      apiInterface.setUserId(...args)

      expect(getInfo(agentId).jsAttributes['enduser.id']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          'enduser.id': faker.datatype.uuid()
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
      const args = [faker.datatype.uuid()]
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
      const args = [faker.datatype.uuid()]
      apiInterface.setApplicationVersion(...args)

      expect(getInfo(agentId).jsAttributes['application.version']).toEqual(args[0])
    })

    test('should delete custom attribute when value is null', () => {
      const args = [null]
      setInfo(agentId, {
        ...(getInfo(agentId)),
        jsAttributes: {
          'application.version': faker.datatype.uuid()
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

    test('should create SM event emitter event for calls to API when features are undefined', () => {
      apiInterface.start()

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/start/undefined/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test('should create SM event emitter event for calls to API when features are undefined', () => {
      const features = [faker.datatype.uuid()]
      apiInterface.start(features)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        SUPPORTABILITY_METRIC_CHANNEL,
        ['API/start/defined/called'],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
    })

    test('should emit event emitter events for all features when input is undefined', () => {
      apiInterface.start()

      Object.values(FEATURE_NAMES).forEach(featureName => {
        expect(instanceEE.emit).toHaveBeenCalledWith(`${featureName}-opt-in`)
      })
    })

    test('should emit event emitter events for all features when input is set', () => {
      apiInterface.start(Object.values(FEATURE_NAMES))

      Object.values(FEATURE_NAMES).forEach(featureName => {
        expect(instanceEE.emit).toHaveBeenCalledWith(`${featureName}-opt-in`)
      })
    })

    test('should return early and warn for invalid feature names', () => {
      const badFeatureName = faker.datatype.uuid()
      apiInterface.start(badFeatureName)

      Object.values(FEATURE_NAMES).forEach(featureName => {
        expect(instanceEE.emit).not.toHaveBeenCalledWith(`${featureName}-opt-in`)
      })
      expect(instanceEE.emit).not.toHaveBeenCalledWith(`${badFeatureName}-opt-in`)
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid feature name supplied'))
    })

    test('should always include page view event feature', () => {
      apiInterface.start(['spa'])

      expect(instanceEE.emit).toHaveBeenCalledWith('page_view_event-opt-in')
      expect(instanceEE.emit).toHaveBeenCalledWith('spa-opt-in')
    })
  })

  describe('noticeError', () => {
    let apiInterface

    beforeEach(async () => {
      apiInterface = setAPI(agentId, true)
      await new Promise(process.nextTick)
    })

    test('should create event emitter event for calls to API', () => {
      const args = [faker.datatype.uuid()]
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
        [expect.any(Error), expect.toBeNumber(), false, undefined],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
    })

    test('should pass the error object as is when provided', () => {
      const args = [new Error(faker.datatype.uuid())]
      apiInterface.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, undefined],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
    })

    test('should pass the custom attributes object as is when provided', () => {
      const args = [new Error(faker.datatype.uuid()), {
        [faker.datatype.uuid()]: faker.datatype.uuid(),
        [faker.datatype.uuid()]: faker.datatype.uuid(),
        [faker.datatype.uuid()]: faker.datatype.uuid()
      }]
      apiInterface.noticeError(...args)

      expect(handleModule.handle).toHaveBeenCalledWith(
        'err',
        [args[0], expect.toBeNumber(), false, args[1]],
        undefined,
        FEATURE_NAMES.jserrors,
        instanceEE
      )
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
      { api: 'actionText', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'setName', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'setAttribute', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'save', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'ignore', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'onEnd', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'getContext', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'end', args: [faker.datatype.uuid(), faker.datatype.uuid()] },
      { api: 'get', args: [faker.datatype.uuid(), faker.datatype.uuid()] }
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
        const args = [faker.datatype.uuid(), jest.fn()]
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
        const args = [faker.datatype.uuid()]
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
        const args = [faker.datatype.uuid(), jest.fn()]
        const tracer = interaction.createTracer(...args)

        const tracerArgs = [faker.datatype.uuid(), faker.datatype.uuid()]
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
        const args = [faker.datatype.uuid(), jest.fn(() => { throw testError })]
        const tracer = interaction.createTracer(...args)

        const tracerArgs = [faker.datatype.uuid(), faker.datatype.uuid()]
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
