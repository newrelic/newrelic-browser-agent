import { faker } from '@faker-js/faker'
import { FEATURE_NAMES } from '../../src/loaders/features/features'
import { CUSTOM_METRIC_CHANNEL } from '../../src/features/metrics/constants'
import { setAsyncAPI } from '../../src/loaders/api/apiAsync'
import { ee } from '../../src/common/event-emitter/contextual-ee'
import * as registerHandlerModule from '../../src/common/event-emitter/register-handler'
import * as handleModule from '../../src/common/event-emitter/handle'
import { originTime } from '../../src/common/constants/runtime'

describe('setAsyncAPI', () => {
  let agentId
  let instanceEE
  let agentInst

  beforeEach(() => {
    agentId = faker.string.uuid()

    console.warn = jest.fn()
    jest.spyOn(handleModule, 'handle')

    instanceEE = ee.get(agentId)
    jest.spyOn(instanceEE, 'emit')
    jest.spyOn(registerHandlerModule, 'registerHandler')

    agentInst = {
      ee: instanceEE,
      runtime: {
        onerror: undefined,
        releaseIds: {}
      }
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should register expected api methods as handlers on the instance event emitter', () => {
    setAsyncAPI(agentInst)

    expect(registerHandlerModule.registerHandler).toHaveBeenCalledTimes(4)
    expect(registerHandlerModule.registerHandler).toHaveBeenCalledWith(
      'api-finished',
      expect.any(Function),
      'api',
      instanceEE
    )
    expect(registerHandlerModule.registerHandler).toHaveBeenCalledWith(
      'api-setErrorHandler',
      expect.any(Function),
      'api',
      instanceEE
    )
    expect(registerHandlerModule.registerHandler).toHaveBeenCalledWith(
      'api-addToTrace',
      expect.any(Function),
      'api',
      instanceEE
    )
    expect(registerHandlerModule.registerHandler).toHaveBeenCalledWith(
      'api-addRelease',
      expect.any(Function),
      'api',
      instanceEE
    )
  })

  describe('finished', () => {
    let apiFn

    beforeEach(() => {
      setAsyncAPI(agentInst)

      apiFn = jest.mocked(registerHandlerModule.registerHandler).mock.calls[0][1]
    })

    test('should create event emitter events and add to the trace', () => {
      const time = Date.now()
      apiFn(time)

      expect(handleModule.handle).toHaveBeenCalledTimes(3)
      expect(handleModule.handle).toHaveBeenCalledWith(
        CUSTOM_METRIC_CHANNEL,
        ['finished', { time }],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'bstApi',
        [expect.objectContaining({ o: 'nr', s: time })],
        undefined,
        FEATURE_NAMES.sessionTrace,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-addPageAction',
        [time, 'finished'],
        undefined,
        FEATURE_NAMES.genericEvents,
        instanceEE
      )
    })

    test('should calculate time from provided time', () => {
      const time = Date.now()
      const providedTime = faker.number.int({ min: 300, max: 400 })
      apiFn(time, providedTime)

      expect(handleModule.handle).toHaveBeenCalledTimes(3)
      expect(handleModule.handle).toHaveBeenCalledWith(
        CUSTOM_METRIC_CHANNEL,
        ['finished', { time: providedTime - originTime }],
        undefined,
        FEATURE_NAMES.metrics,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'bstApi',
        [expect.objectContaining({ o: 'nr', s: providedTime - originTime })],
        undefined,
        FEATURE_NAMES.sessionTrace,
        instanceEE
      )
      expect(handleModule.handle).toHaveBeenCalledWith(
        'api-addPageAction',
        [providedTime - originTime, 'finished'],
        undefined,
        FEATURE_NAMES.genericEvents,
        instanceEE
      )
    })
  })

  describe('addToTrace', () => {
    let apiFn

    beforeEach(() => {
      setAsyncAPI(agentInst)

      apiFn = jest.mocked(registerHandlerModule.registerHandler).mock.calls[2][1]
    })

    test.each([
      null,
      undefined,
      {},
      { name: null },
      { name: faker.string.uuid() },
      { name: faker.string.uuid(), start: null },
      { name: faker.string.uuid(), start: 0 }
    ])('should return early and not create event emitter event when input event is %s', (event) => {
      const time = Date.now()
      apiFn(time, event)

      expect(handleModule.handle).toHaveBeenCalledTimes(0)
    })

    test('should create event emitter event', () => {
      const time = Date.now()
      const event = {
        name: faker.string.uuid(),
        start: faker.number.int({ min: 300, max: 400 })
      }
      apiFn(time, event)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'bstApi',
        [expect.objectContaining({
          n: event.name,
          s: event.start - originTime,
          e: event.start - originTime,
          o: '',
          t: 'api'
        })],
        undefined,
        FEATURE_NAMES.sessionTrace,
        instanceEE
      )
    })

    test('should use provided end time', () => {
      const time = Date.now()
      const event = {
        name: faker.string.uuid(),
        start: faker.number.int({ min: 300, max: 400 }),
        end: faker.number.int({ min: 500, max: 600 })
      }
      apiFn(time, event)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'bstApi',
        [expect.objectContaining({
          e: event.end - originTime
        })],
        undefined,
        FEATURE_NAMES.sessionTrace,
        instanceEE
      )
    })

    test('should use provided origin', () => {
      const time = Date.now()
      const event = {
        name: faker.string.uuid(),
        start: faker.number.int({ min: 300, max: 400 }),
        origin: faker.string.uuid()
      }
      apiFn(time, event)

      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(handleModule.handle).toHaveBeenCalledWith(
        'bstApi',
        [expect.objectContaining({
          o: event.origin
        })],
        undefined,
        FEATURE_NAMES.sessionTrace,
        instanceEE
      )
    })
  })

  describe('setErrorHandler', () => {
    let apiFn

    beforeEach(() => {
      setAsyncAPI(agentInst)

      apiFn = jest.mocked(registerHandlerModule.registerHandler).mock.calls[1][1]

      agentInst.runtime.onerror = undefined // reset the error handler
    })

    test('should set the agent error handler', () => {
      const time = Date.now()
      const errorHandler = jest.fn()

      apiFn(time, errorHandler)

      expect(agentInst.runtime.onerror).toEqual(errorHandler)
    })
  })

  describe('addRelease', () => {
    let apiFn

    beforeEach(() => {
      setAsyncAPI(agentInst)

      apiFn = jest.mocked(registerHandlerModule.registerHandler).mock.calls[3][1]

      agentInst.runtime.releaseIds = {}
    })

    test('should add the release to the runtime', () => {
      const time = Date.now()
      const releaseName = faker.string.uuid()
      const releaseVersion = faker.string.uuid()

      apiFn(time, releaseName, releaseVersion)

      const releases = agentInst.runtime.releaseIds
      expect(Object.entries(releases).length).toEqual(1)
      expect(Object.entries(releases)).toEqual([[releaseName, releaseVersion]])
    })

    test('should only add 10 releases', () => {
      const time = Date.now()

      for (let i = 0; i < 20; i++) {
        const releaseName = faker.string.uuid()
        const releaseVersion = faker.string.uuid()
        apiFn(time, releaseName, releaseVersion)
      }

      const releases = agentInst.runtime.releaseIds
      expect(Object.entries(releases).length).toEqual(10)
    })

    test('should limit name and id to 200 characters', () => {
      const time = Date.now()
      const releaseName = faker.random.alpha(300)
      const releaseVersion = faker.random.alpha(300)

      apiFn(time, releaseName, releaseVersion)

      const releases = agentInst.runtime.releaseIds
      expect(Object.keys(releases)[0].length).toEqual(200)
      expect(Object.values(releases)[0].length).toEqual(200)
    })
  })
})
