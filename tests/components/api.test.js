import { faker } from '@faker-js/faker'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../../src/features/metrics/constants'
import * as handleModule from '../../src/common/event-emitter/handle'

import { setupAgent } from './setup-agent'

import { Instrument as AJAX } from '../../src/features/ajax/instrument'
import { Instrument as Logging } from '../../src/features/logging/instrument'
import { Instrument as PageViewEvent } from '../../src/features/page_view_event/instrument'
import { Instrument as PageViewTiming } from '../../src/features/page_view_timing/instrument'
import { Instrument as Metrics } from '../../src/features/metrics/instrument'
import { Instrument as JSErrors } from '../../src/features/jserrors/instrument'
import { Instrument as SessionTrace } from '../../src/features/session_trace/instrument'
import { Instrument as SessionReplay } from '../../src/features/session_replay/instrument'
import { Instrument as SoftNavigations } from '../../src/features/soft_navigations/instrument'
import { Instrument as SPA } from '../../src/features/spa/instrument'
import { Instrument as GenericEvents } from '../../src/features/generic_events/instrument'

import { setupSetCustomAttributeAPI } from '../../src/loaders/api/setCustomAttribute'
import { setupSetUserIdAPI } from '../../src/loaders/api/setUserId'
import { setupSetApplicationVersionAPI } from '../../src/loaders/api/setApplicationVersion'
import { setupStartAPI } from '../../src/loaders/api/start'
import { setupConsentAPI } from '../../src/loaders/api/consent'
import { setTopLevelCallers } from '../../src/loaders/api/topLevelCallers'
import { gosCDN } from '../../src/common/window/nreum'
import { now } from '../../src/common/timing/now'

jest.retryTimes(0)

let entityGuid, agent
describe('API tests', () => {
  describe('APIs', () => {
    beforeAll(() => {
      agent = setupAgent()
    })

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

    test('should add expected api methods returned object', async () => {
      const apiNames = [
        'setErrorHandler',
        'finished',
        'addToTrace',
        'addRelease',
        'addPageAction',
        'recordCustomEvent',
        'setCurrentRouteName',
        'setPageViewName',
        'setCustomAttribute',
        'interaction',
        'noticeError',
        'setUserId',
        'setApplicationVersion',
        'start',
        'recordReplay',
        'pauseReplay',
        'log',
        'wrapLogger',
        'register',
        'measure',
        'consent'
      ]
      apiNames.forEach(apiName => checkApiExists(apiName, false))

      setupSetCustomAttributeAPI(agent)
      checkApiExists('setCustomAttribute', true)

      setupSetUserIdAPI(agent)
      checkApiExists('setUserId', true)

      setupSetApplicationVersionAPI(agent)
      checkApiExists('setApplicationVersion', true)

      setupStartAPI(agent)
      checkApiExists('start', true)

      setupConsentAPI(agent)
      checkApiExists('consent', true)

      const agentKeyCount = Object.keys(agent).length
      await initializeFeature(AJAX, agent)
      await initializeFeature(PageViewTiming, agent)
      await initializeFeature(Metrics, agent)
      expect(agentKeyCount).toEqual(Object.keys(agent).length) // no new keys added due to these features which have no APIs

      await initializeFeature(Logging, agent)
      ;['log', 'wrapLogger', 'register'].forEach(apiName => checkApiExists(apiName, true))

      await initializeFeature(PageViewEvent, agent)
      ;['setPageViewName'].forEach(apiName => checkApiExists(apiName, true))

      delete agent.register
      await initializeFeature(JSErrors, agent)
      ;['noticeError', 'setErrorHandler', 'addRelease', 'register'].forEach(apiName => checkApiExists(apiName, true))

      await initializeFeature(SessionTrace, agent)
      ;['addToTrace', 'finished'].forEach(apiName => checkApiExists(apiName, true))

      await initializeFeature(SessionReplay, agent)
      ;['recordReplay', 'pauseReplay'].forEach(apiName => checkApiExists(apiName, true))

      await initializeFeature(SoftNavigations, agent)
      ;['interaction'].forEach(apiName => checkApiExists(apiName, true))

      delete agent.interaction
      await initializeFeature(SPA, agent)
      ;['interaction'].forEach(apiName => checkApiExists(apiName, true))

      delete agent.register
      await initializeFeature(GenericEvents, agent)
      ;['addPageAction', 'recordCustomEvent', 'finished', 'register', 'measure'].forEach(apiName => checkApiExists(apiName, true))

      function checkApiExists (apiName, shouldBeDefined = false) {
        if (shouldBeDefined) expect(agent[apiName]).toBeDefined()
        else (expect(agent[apiName]).toBeUndefined())
      }
    })

    describe('setErrorHandler', () => {
      test('should execute as expected', async () => {
        const mockHandler = jest.fn()
        agent.setErrorHandler(mockHandler)
        expectHandled('storeSupportabilityMetrics', ['API/setErrorHandler/called'])
        expect(agent.runtime.onerror).toEqual(mockHandler)
      })
    })

    describe('finished', () => {
      test('should execute as expected', async () => {
        const n = now()
        agent.finished()
        expectHandled('storeSupportabilityMetrics', ['API/finished/called'])

        expectHandled('storeEventMetrics', ['finished', { time: expect.any(Number) }])
        const storeEventMetricsCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'storeEventMetrics')
        expect(Math.abs(storeEventMetricsCall[1][1].time - n)).toBeLessThanOrEqual(1) // should be unix timestamp

        expectHandled('storeSupportabilityMetrics', ['API/addToTrace/called'])

        expectHandled('bstApi', [{ e: expect.toBeNumber(), n: 'finished', o: 'nr', s: expect.toBeNumber(), t: 'api' }])
        const bstApiCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'bstApi')
        expect(Math.abs(bstApiCall[1][0].s - (n))).toBeLessThanOrEqual(1) // should be unix timestamp
        expect(Math.abs(bstApiCall[1][0].e - (n))).toBeLessThanOrEqual(1) // should be unix timestamp

        expectHandled('api-addPageAction', [expect.any(Number), 'finished']) // unix timestamp
        const addPageActionCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'api-addPageAction')
        expect(addPageActionCall[1][0]).toBeLessThan(10000) // should be relative timestamp
        expect(Math.abs(addPageActionCall[1][0] - n)).toBeLessThanOrEqual(1) // should be relative timestamp, account for rounding errors
      })

      test('should allow argument as expected', async () => {
        const time = Date.now() + 1000
        const n = now()
        agent.finished(time)
        expectHandled('storeSupportabilityMetrics', ['API/finished/called'])

        expectHandled('storeEventMetrics', ['finished', { time: expect.any(Number) }])
        const storeEventMetricsCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'storeEventMetrics')
        expect(Math.abs(storeEventMetricsCall[1][1].time - (n + 1000))).toBeLessThanOrEqual(1) // should be unix timestamp

        expectHandled('storeSupportabilityMetrics', ['API/addToTrace/called'])

        expectHandled('bstApi', [{ e: expect.toBeNumber(), n: 'finished', o: 'nr', s: expect.toBeNumber(), t: 'api' }])
        const bstApiCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'bstApi')
        expect(Math.abs(bstApiCall[1][0].s - (n + 1000))).toBeLessThanOrEqual(1) // should be unix timestamp
        expect(Math.abs(bstApiCall[1][0].e - (n + 1000))).toBeLessThanOrEqual(1) // should be unix timestamp

        expectHandled('api-addPageAction', [expect.any(Number), 'finished']) // unix timestamp
        const addPageActionCall = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'api-addPageAction')
        expect(addPageActionCall[1][0]).toBeLessThan(10000) // should be relative timestamp
        expect(Math.abs(addPageActionCall[1][0] - (n + 1000))).toBeLessThanOrEqual(1) // should be relative timestamp, account for rounding errors
      })

      test('should warn for bad arg', async () => {
        const debugSpy = jest.spyOn(console, 'debug')
        const n = now()
        agent.finished(n)
        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#62'), n)
      })
    })

    describe('addToTrace', () => {
      test('should execute as expected', async () => {
        agent.addToTrace({
          name: 'Event Name',
          start: Date.now(),
          end: Date.now() + 1000, // 1000ms apart
          origin: 'Origin of event'
        })
        expectHandled('storeSupportabilityMetrics', ['API/addToTrace/called'])
        expectHandled('bstApi', [{ e: expect.toBeNumber(), n: 'Event Name', o: 'Origin of event', s: expect.toBeNumber(), t: 'api' }])

        const payload = handleModule.handle.mock.calls.find(callArr => callArr[0] === 'bstApi')[1][0]
        expect(payload.e - payload.s).toEqual(1000) // end - start was 1000ms apart in API call
      })

      test('should return error code for negative timestamps', () => {
        agent.addToTrace({
          name: 'Event Name',
          start: Date.now(),
          end: -1000,
          origin: 'Origin of event'
        })

        expect(console.debug).toHaveBeenCalledTimes(1)
        expect(console.debug).toHaveBeenLastCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#61'), expect.any(Object))

        agent.addToTrace({
          name: 'Event Name',
          start: -1234,
          end: Date.now() + 1000,
          origin: 'Origin of event'
        })

        expect(console.debug).toHaveBeenCalledTimes(2)
        expect(console.debug).toHaveBeenLastCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#61'), expect.any(Object))
      })

      test('should return error code for end time before start time', () => {
        agent.addToTrace({
          name: 'Event Name',
          start: Date.now() + 2000,
          end: Date.now() + 1000,
          origin: 'Origin of event'
        })

        expect(console.debug).toHaveBeenCalled()
        expect(console.debug).toHaveBeenLastCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#61'), expect.any(Object))
      })
    })

    describe('addRelease', () => {
      test('should execute as expected', async () => {
        agent.addRelease('foo', 'bar')
        expectHandled('storeSupportabilityMetrics', ['API/addRelease/called'])
        expect(agent.runtime.releaseIds).toEqual({ foo: 'bar' })
      })
    })

    describe('addPageAction', () => {
      test('should execute as expected', () => {
        const args = [faker.string.uuid(), faker.string.uuid()]
        agent.addPageAction(...args)

        expectHandled('storeSupportabilityMetrics', ['API/addPageAction/called'])
        expectHandled('api-addPageAction', [expect.toBeNumber(), ...args])
      })
    })

    describe('setCurrentRouteName - SPA', () => {
      test('should execute as expected', () => {
        agent.setCurrentRouteName('test')

        expectHandled('storeSupportabilityMetrics', ['API/setCurrentRouteName/called'])
        expectHandled('api-routeName', [expect.toBeNumber(), 'test'])
      })
    })

    describe('setCurrentRouteName - SoftNav', () => {
      test('should execute as expected', () => {
        agent.setCurrentRouteName('test')

        expectHandled('storeSupportabilityMetrics', ['API/setCurrentRouteName/called'])
        expectHandled('api-routeName', [expect.toBeNumber(), 'test'])
      })
    })

    describe('setPageViewName', () => {
      test('should execute as expected', () => {
        agent.setPageViewName('test')

        expectHandled('storeSupportabilityMetrics', ['API/setPageViewName/called'])
        expectHandled('api-setPageViewName', [expect.toBeNumber()])
        expect(agent.runtime.customTransaction).toEqual('http://custom.transaction/test')
      })

      test.each([null, undefined])('should return early when name is %s', (name) => {
        const args = [name, faker.string.uuid()]
        agent.setPageViewName(...args)

        expectHandled('storeSupportabilityMetrics', ['API/setPageViewName/called'])
        expectHandled('api-setPageViewName', [expect.toBeNumber()], false)

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
      test('should execute as expected', () => {
        agent.setCustomAttribute('foo', 'bar')

        expectHandled('storeSupportabilityMetrics', ['API/setCustomAttribute/called'])
        expect(agent.info.jsAttributes).toEqual({ foo: 'bar' })
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

        expectHandled('api-setCustomAttribute', [expect.toBeNumber(), args[0], args[1]])
      })

      test('should always create session event emitter event when value is null and persistance argument is false', () => {
        const args = [faker.string.uuid(), null, false]
        agent.setCustomAttribute(...args)

        expect(handleModule.handle).toHaveBeenCalledTimes(2)
        expectHandled('api-setCustomAttribute', [expect.toBeNumber(), args[0], args[1]])
      })
    })

    describe('setUserId', () => {
      test('should always persist the user id attribute', () => {
        const args = [faker.string.uuid()]
        agent.setUserId(...args)

        expectHandled('storeSupportabilityMetrics', ['API/setUserId/called'])
        expectHandled('api-setUserId', [expect.toBeNumber(), 'enduser.id', ...args])
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

      test('should not reset session when setUserId is called with reset session true and current user is undefined', () => {
        const originalSessionId = agent.runtime.session.state.value

        expect(agent.info.jsAttributes['enduser.id']).toEqual(undefined)

        agent.setUserId('user1', true) // simulate trying to reset session when setting userid for first time

        expect(agent.runtime.session.state.value).toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual('user1')
        expect(handleModule.handle).not.toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })

      test('should not reset session when setUserId is called with reset session true and current user is null', () => {
        agent.setUserId(null)
        expect(agent.info.jsAttributes['enduser.id']).toEqual(undefined)

        const originalSessionId = agent.runtime.session.state.value

        agent.setUserId('user1', true)

        expect(agent.runtime.session.state.value).toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual('user1')
        expect(handleModule.handle).not.toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })

      test('should not reset session when setUserId is called with userid and false for reset session argument', () => {
        agent.setUserId('user1')

        const originalSessionId = agent.runtime.session.state.value

        const secondUserId = 'user2'
        agent.setUserId(secondUserId, false) // simulate updating user id without resetting session

        expect(agent.runtime.session.state.value).toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual('user2')
        expect(handleModule.handle).not.toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })

      test('should not reset session when setUserId is called with reset session true and current user is the same userid', () => {
        const origUserId = 'user1'
        agent.setUserId(origUserId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual(origUserId)

        const originalSessionId = agent.runtime.session.state.value

        agent.setUserId(origUserId, true)

        expect(agent.runtime.session.state.value).toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual('user1')
        expect(handleModule.handle).not.toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })

      test('should reset session when setUserId is called with a diff userid and true for reset session argument', () => {
        agent.setUserId('user1')

        agent.runtime.session.state.value = faker.string.uuid()
        const originalSessionId = agent.runtime.session.state.value

        const secondUserId = 'user2'
        agent.setUserId(secondUserId, true)

        expect(agent.runtime.session.state.value).not.toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual('user2')
        expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })

      test('should reset session when setUserId is called with userId = null, reset session true and currentId is not null', () => {
        const origUserId = faker.string.uuid()
        agent.setUserId(origUserId)

        agent.runtime.session.state.value = faker.string.uuid()
        const originalSessionId = agent.runtime.session.state.value

        agent.setUserId(null, true) // simulate unsetting user id + resetting session

        expect(agent.runtime.session.state.value).not.toEqual(originalSessionId)
        expect(agent.info.jsAttributes['enduser.id']).toEqual(undefined)
        expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['API/setUserId/resetSession/called'], undefined, 'metrics', expect.any(Object))
      })
    })

    describe('setApplicationVersion', () => {
      test('should only create SM event emitter event for calls to API', () => {
        agent.setApplicationVersion(faker.string.uuid())

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/setApplicationVersion/called'])
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
      test('should create SM event emitter event for calls to API', () => {
        agent.start()
        expectHandled('storeSupportabilityMetrics', ['API/start/called'])
      })

      test('should emit event to start all features (if not auto)', () => {
        agent.start()
        expectEmitted('manual-start-all')
      })

      test('should emit start even if some arg is passed', () => {
        const badFeatureName = faker.string.uuid()
        agent.start(badFeatureName)

        expectEmitted('manual-start-all')
        expect(agent.ee.emit).not.toHaveBeenCalledWith(badFeatureName)
        expect(console.debug).not.toHaveBeenCalled()
      })
    })

    describe('consent', () => {
      test('should create SM event emitter event for calls to API', () => {
        agent.consent()
        expectHandled('storeSupportabilityMetrics', ['API/consent/called'])
      })

      test('should set consent session state to true without arguments', () => {
        agent.consent()
        expect(agent.runtime.session.state.consent).toEqual(true)
      })

      test('should set consent session state to true if argument is true', () => {
        agent.consent(true)
        expect(agent.runtime.session.state.consent).toEqual(true)
      })

      test('should set consent session state to false if argument is false', () => {
        agent.consent(false)
        expect(agent.runtime.session.state.consent).toEqual(false)
      })

      test('should warn if argument is not undefined and not a boolean', () => {
        agent.consent('invalid')

        expect(console.debug).toHaveBeenCalledTimes(1)
        expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#65'), typeof 'invalid')
      })
    })

    describe('noticeError', () => {
      test('should create event emitter event for calls to API', () => {
        agent.noticeError(faker.string.uuid())

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/noticeError/called'])
        expectHandled('err', [expect.any(Error), expect.toBeNumber(), false, undefined, false])
      })

      test('should pass the error object as is when provided', () => {
        const args = [new Error(faker.string.uuid())]
        agent.noticeError(...args)

        expectHandled('err', [args[0], expect.toBeNumber(), false, undefined, false])
      })

      test('should pass the custom attributes object as is when provided', () => {
        const args = [new Error(faker.string.uuid()), {
          [faker.string.uuid()]: faker.string.uuid(),
          [faker.string.uuid()]: faker.string.uuid(),
          [faker.string.uuid()]: faker.string.uuid()
        }]
        agent.noticeError(...args)

        expectHandled('err', [args[0], expect.toBeNumber(), false, args[1], false])
      })
    })

    describe('register', () => {
      let id, name

      const expectHandle = (type, args, count = 1) => {
        expect(handleModule.handle.mock.calls.filter(call => {
          return call[0] === type && !!call[1].find(arg => arg === args)
        }).length).toEqual(count)
      }

      beforeAll(async () => {
        await initializeFeature(Logging, agent)
        await initializeFeature(JSErrors, agent)
        await initializeFeature(GenericEvents, agent)
      })

      beforeEach(async () => {
        agent.init.api.allow_registered_children = true
        id = faker.string.uuid()
        name = faker.string.uuid()
      })

      test('should return api object', () => {
        const myApi = agent.register({ id, name })

        /** wait for entity guid to be assigned */
        expect(myApi).toMatchObject({
          noticeError: expect.any(Function),
          log: expect.any(Function),
          addPageAction: expect.any(Function),
          setCustomAttribute: expect.any(Function),
          setUserId: expect.any(Function),
          setApplicationVersion: expect.any(Function),
          metadata: {
            customAttributes: {},
            target: { licenseKey: expect.any(String), id, name }
          }
        })
      })

      ;[{ id }, { name }].forEach(opts => {
        test('should warn and not work if invalid target', () => {
          let myApi = agent.register(opts)
          expect(console.debug).toHaveBeenCalledWith('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#48', opts)
          myApi.addPageAction()
          myApi.noticeError()
          myApi.log()
          expect(console.debug).toHaveBeenCalledTimes(2)
        })
      })

      test('should warn and not work if disabled', () => {
        agent.init.api.allow_registered_children = false
        let myApi = agent.register({ id, name })
        expect(console.debug.mock.calls.map(call => call[0]).some(tag => tag.includes('#54'))).toEqual(true)
        myApi.addPageAction()
        myApi.noticeError()
        myApi.log()
        expect(console.debug).toHaveBeenCalledTimes(2)
      })

      test('should update custom attributes', () => {
        const myApi = agent.register({ id, name })

        myApi.setCustomAttribute('foo', 'bar')
        expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar' })

        myApi.setCustomAttribute('foo', 'bar2')
        expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2' })

        myApi.setApplicationVersion('appversion')
        expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2', 'application.version': 'appversion' })

        myApi.setUserId('userid')
        expect(myApi.metadata.customAttributes).toEqual({ foo: 'bar2', 'application.version': 'appversion', 'enduser.id': 'userid' })
      })

      test('should duplicate data with config - true', () => {
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        const customAttrs = { foo: 'bar' }

        myApi.log('test', { customAttributes: customAttrs })

        expectHandle('storeSupportabilityMetrics', 'API/register/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/register/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/logging/info/called', 2)
        expectHandle('log', 'test', 2)

        agent.init.api.duplicate_registered_data = false
      })

      test('should add child.id and child.type to duplicated data - log', () => {
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        const customAttrs = { foo: 'bar' }

        myApi.log('test', { customAttributes: customAttrs })

        // Find the handle calls for 'log'
        const logCalls = handleModule.handle.mock.calls.filter(call => call[0] === 'log')
        expect(logCalls.length).toBe(2)

        // First call is the duplicate to container - should have child.id and child.type
        const containerCall = logCalls[0]
        expect(containerCall[1][2]).toEqual({ foo: 'bar', 'child.id': id, 'child.type': 'MFE' })

        // Second call is to the registered entity target - should not have child.id or child.type
        const targetCall = logCalls[1]
        expect(targetCall[1][2]).toEqual({ foo: 'bar' })
        expect(targetCall[1][2]).not.toHaveProperty('child.id')
        expect(targetCall[1][2]).not.toHaveProperty('child.type')

        agent.init.api.duplicate_registered_data = false
      })

      test('should add child.id and child.type to duplicated data - addPageAction', () => {
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        const customAttrs = { foo: 'bar' }

        myApi.addPageAction('test', customAttrs)

        // Find the handle calls for 'api-addPageAction'
        const pageActionCalls = handleModule.handle.mock.calls.filter(call => call[0] === 'api-addPageAction')
        expect(pageActionCalls.length).toBe(2)

        console.log('pageActionCalls:', pageActionCalls)

        // First call is the duplicate to container - should have child.id and child.type
        const containerCall = pageActionCalls[0]
        expect(containerCall[1][2]).toEqual({ foo: 'bar', 'child.id': id, 'child.type': 'MFE' })

        // Second call is to the registered entity target - should not have child.id or child.type
        const targetCall = pageActionCalls[1]
        expect(targetCall[1][2]).toEqual({ foo: 'bar' })
        agent.init.api.duplicate_registered_data = false
      })

      test('should add child.id and child.type to duplicated data - noticeError', () => {
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        const err = new Error('test')
        const customAttrs = { foo: 'bar' }

        myApi.noticeError(err, customAttrs)

        // Find the handle calls for 'err'
        const errorCalls = handleModule.handle.mock.calls.filter(call => call[0] === 'err')
        expect(errorCalls.length).toBe(2)

        // First call is the duplicate to container - should have child.id and child.type
        const containerCall = errorCalls[0]
        expect(containerCall[1][3]).toEqual({ foo: 'bar', 'child.id': id, 'child.type': 'MFE' })

        // Second call is to the registered entity target - should not have child.id or child.type
        const targetCall = errorCalls[1]
        expect(targetCall[1][3]).toEqual({ foo: 'bar' })

        agent.init.api.duplicate_registered_data = false
      })

      test('should add child.id and child.type to duplicated data - measure', () => {
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        myApi.measure('test', { customAttributes: { foo: 'bar' } })

        // Find the handle calls for 'api-measure'
        const measureCalls = handleModule.handle.mock.calls.filter(call => call[0] === 'api-measure')
        expect(measureCalls.length).toBe(2)

        console.log('measureCalls:', measureCalls[0][1])

        // First call is the duplicate to container - should have child.id and child.type in customAttributes
        const containerCall = measureCalls[0]
        expect(containerCall[1][0].customAttributes).toEqual({ foo: 'bar', 'child.id': id, 'child.type': 'MFE' })

        // Second call is to the registered entity target - should not have child.id or child.type
        const targetCall = measureCalls[1]
        expect(targetCall[1][0].customAttributes).toEqual({ foo: 'bar' })

        agent.init.api.duplicate_registered_data = false
      })

      test('should add child.id and child.type to duplicated data - recordCustomEvent', () => {
        console.log('THE TEST IN QUESTION')
        agent.init.api.duplicate_registered_data = true
        const target = { id, name }
        const myApi = agent.register(target)

        const customAttrs = { foo: 'bar' }

        myApi.recordCustomEvent('testEvent', customAttrs)

        // Find the handle calls for 'api-recordCustomEvent'
        const customEventCalls = handleModule.handle.mock.calls.filter(call => call[0] === 'api-recordCustomEvent')
        expect(customEventCalls.length).toBe(2)

        // First call is the duplicate to container - should have child.id and child.type
        const containerCall = customEventCalls[0]
        console.log('containerCall:', containerCall)
        expect(containerCall[1][2]).toEqual({ foo: 'bar', 'child.id': id, 'child.type': 'MFE' })

        // Second call is to the registered entity target - should not have child.id or child.type
        const targetCall = customEventCalls[1]
        expect(targetCall[1][2]).toEqual({ foo: 'bar' })

        agent.init.api.duplicate_registered_data = false
      })

      test('should duplicate data with config - matching entity guid', async () => {
        agent.init.api.duplicate_registered_data = [entityGuid]
        const target = { id, name }
        const myApi = agent.register(target)

        const customAttrs = { foo: 'bar' }

        myApi.log('test', { customAttributes: customAttrs })

        expectHandle('storeSupportabilityMetrics', 'API/register/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/register/log/called', 1)
        expectHandle('storeSupportabilityMetrics', 'API/logging/info/called', 2)
        expectHandle('log', 'test', 2)

        agent.init.api.duplicate_registered_data = false
      })

      describe('noticeError', () => {
        test('should call base apis', async () => {
          const target = { id, name }
          const myApi = agent.register(target)

          const err = new Error('test')
          const customAttrs = { foo: 'bar' }

          myApi.noticeError(err, customAttrs)

          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/noticeError/called')
          expectHandle('err', err)
        })
      })

      describe('addPageAction', () => {
        test('should call base apis', async () => {
          const target = { id, name }
          const myApi = agent.register(target)

          const customAttrs = { foo: 'bar' }

          myApi.addPageAction('test', customAttrs)

          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/addPageAction/called')
          expectHandle('api-addPageAction', 'test')
        })
      })

      describe('log', () => {
        test('should call base apis', async () => {
          const target = { id, name }
          const myApi = agent.register(target)

          const customAttrs = { foo: 'bar' }

          myApi.log('test', { customAttributes: customAttrs })

          expectHandle('storeSupportabilityMetrics', 'API/register/called')
          expectHandle('storeSupportabilityMetrics', 'API/register/log/called')
          expectHandle('log', 'test')
        })
      })
    })

    describe('logging', () => {
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

          expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/wrapLogger/called'])

          expectEmitted('wrap-logger-start', [expect.any(Array), expect.any(Object), 'myObservedLogger'])
          expectEmitted('wrap-logger-end', [['test1'], expect.any(Object), undefined])

          expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/logging/info/called'])
          expectHandled('log', [expect.any(Number), 'test1', {}, 'INFO', false, undefined])

          const callCount = agent.ee.emit.mock.calls.length
          /** does NOT emit data for observed fn */
          myLoggerPackage.myUnobservedLogger('test1')

          expect(myLoggerPackage.myUnobservedLogger).toHaveBeenCalled()
          expect(agent.ee.emit).toHaveBeenCalledTimes(callCount) // should still be the same since no events were emitted
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

          expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/wrapLogger/called'])

          expectEmitted('wrap-logger-start', [expect.any(Array), expect.any(Object), randomMethodName])
          expectEmitted('wrap-logger-end', [['test1'], expect.any(Object), undefined])

          expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/logging/warn/called'])
          expectHandled('log', [expect.any(Number), 'test1', {}, 'warn', false, undefined])
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

          expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/wrapLogger/called'])

          expectEmitted('wrap-logger-start', [expect.any(Array), expect.any(Object), randomMethodName])
          expectEmitted('wrap-logger-end', [['test1', { test2: 2 }, ['test3'], true, 1], expect.any(Object), undefined])
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

            expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/log/called'])
            expectHandled(SUPPORTABILITY_METRIC_CHANNEL, [`API/logging/${logMethod.toLowerCase().replace('log', '')}/called`])
            expectHandled('log', [expect.any(Number), args[0], args[1].customAttributes, logMethod.replace('log', ''), false])
          })
        })
      })
    })

    describe('interaction', () => {
      test('should create event emitter event for calls to API', () => {
        agent.interaction()

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/interaction/called'])
        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/get/called'])
        expectHandled('api-ixn-get', [expect.toBeNumber(), expect.any(Object)])
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

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/interaction/called'])
        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/get/called'])
        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, [`API/${api}/called`])
        expectHandled('api-ixn-get', [expect.toBeNumber(), {}])
        expectHandled(`api-ixn-${api}`, [expect.toBeNumber(), ...args])
      })

      describe('createTracer', () => {
        let interaction
        let tracerEE

        beforeEach(() => {
          interaction = agent.interaction()
          tracerEE = agent.ee.get('tracer')
          jest.spyOn(tracerEE, 'emit')
        })

        test('should only emit single event emitter event when no callback is provided', () => {
          const args = [faker.string.uuid()]
          const tracer = interaction.createTracer(...args)
          tracer()

          expectEmitted('no-fn-start', [expect.toBeNumber(), interaction, false])
        })

        test('should emit start and end event emitter events when callback is provided', () => {
          const args = [faker.string.uuid(), jest.fn()]
          const tracer = interaction.createTracer(...args)

          const tracerArgs = [faker.string.uuid(), faker.string.uuid()]
          tracer(...tracerArgs)

          expectEmitted('fn-start', [expect.toBeNumber(), interaction, true])
          expectEmitted('fn-end', [expect.toBeNumber()])

          expect(args[1]).toHaveBeenCalledTimes(1)
          expect(args[1]).toHaveBeenCalledWith(...tracerArgs)
        })

        test('should emit error event emitter event when callback throws an error', () => {
          const checkApiExistsror = new Error(faker.lorem.sentence())
          const args = [faker.string.uuid(), jest.fn(() => { throw checkApiExistsror })]
          const tracer = interaction.createTracer(...args)

          const tracerArgs = [faker.string.uuid(), faker.string.uuid()]
          expect(() => tracer(...tracerArgs)).toThrow(checkApiExistsror)

          expectEmitted('fn-start', [expect.toBeNumber(), interaction, true])
          expectEmitted('fn-err', [expect.objectContaining({ ...tracerArgs }), undefined, checkApiExistsror])
          expectEmitted('fn-end', [expect.toBeNumber()])

          expect(args[1]).toHaveBeenCalledTimes(1)
          expect(args[1]).toHaveBeenCalledWith(...tracerArgs)
        })
      })
    })

    describe('measure', () => {
      beforeAll(() => {
        global.PerformanceMark = function (name, options) {
          this.name = name
          this.startTime = options.startTime
        }
      })
      test('should create event emitter event for calls to API', () => {
        agent.measure('testMeasure')

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/measure/called'])
        expectHandled('api-measure', [expect.any(Object), 'testMeasure'])
      })

      test('should pass in expected attributes into the event emitter call', () => {
        agent.measure('testMeasure', { start: 5, end: 20, customAttributes: { foo: 'bar' } })

        expectHandled(SUPPORTABILITY_METRIC_CHANNEL, ['API/measure/called'])
        const args = { start: 5, end: 20, duration: 15, customAttributes: { foo: 'bar' } }
        expectHandled('api-measure', [args, 'testMeasure'])
      })

      test('should return an object containing measurement details', () => {
        const measurements = agent.measure('testMeasure')
        expect(measurements).toEqual({
          start: expect.any(Number),
          end: expect.any(Number),
          duration: expect.any(Number),
          customAttributes: expect.any(Object)
        })
      })

      test.each([null, undefined, {}, [], 123])('should return early and warn when name is not a string (%s)', (name) => {
        agent.measure(name)

        expect(console.debug).toHaveBeenCalledTimes(1)
        expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#57'), undefined)
      })

      test.each(['start', 'end', 'customAttributes'])('should return early and warn when options argument has invalid types', (param) => {
        agent.measure('testMeasure', { [param]: faker.string.uuid() })

        expect(console.debug).toHaveBeenCalledTimes(1)
        expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#57'), undefined)
      })

      test('should return early and warn when duration is negative', () => {
        agent.measure('testMeasure', { start: 100, end: 50 })

        expect(console.debug).toHaveBeenCalledTimes(1)
        expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#58'), undefined)
      })

      describe('should create correct output', () => {
        let dummyMark
        beforeAll(() => {
          dummyMark = (name, startTime) => new PerformanceMark(name, { startTime })
        })
        test('no arguments', () => {
          jest.spyOn(global.performance, 'now').mockReturnValue(12345)

          const measurements = agent.measure('testMeasure')
          expect(measurements).toEqual({
            start: 0,
            end: 12345,
            duration: 12345 - 0,
            customAttributes: {}
          })
        })

        test('start - number, end undefined', () => {
          jest.spyOn(global.performance, 'now').mockReturnValue(12345)
          const measurements = agent.measure('testMeasure', { start: 1000 })
          expect(measurements).toEqual({
            start: 1000,
            end: 12345,
            duration: 12345 - 1000,
            customAttributes: {}
          })
        })

        test('start - number, end - null', () => {
          jest.spyOn(global.performance, 'now').mockReturnValue(12345)
          const measurements = agent.measure('testMeasure', { start: 1000, end: null })
          expect(measurements).toEqual({
            start: 1000,
            end: 12345,
            duration: 12345 - 1000,
            customAttributes: {}
          })
        })

        test('start - PerformanceMark, end - undefined', () => {
          jest.spyOn(global.performance, 'now').mockReturnValue(12345)

          const measurements = agent.measure('testMeasure', { start: dummyMark('startMark', 1000) })
          expect(measurements).toEqual({
            start: 1000,
            end: 12345,
            duration: 12345 - 1000,
            customAttributes: {}
          })
        })

        test('start - undefined, end - number', () => {
          const measurements = agent.measure('testMeasure', { end: 1000 })
          expect(measurements).toEqual({
            start: 0,
            end: 1000,
            duration: 1000 - 0,
            customAttributes: {}
          })
        })

        test('start - null, end - number', () => {
          const measurements = agent.measure('testMeasure', { start: null, end: 1000 })
          expect(measurements).toEqual({
            start: 0,
            end: 1000,
            duration: 1000 - 0,
            customAttributes: {}
          })
        })

        test('start - undefined, end - PerformanceMark', () => {
          const measurements = agent.measure('testMeasure', { end: dummyMark('endMark', 1000) })
          expect(measurements).toEqual({
            start: 0,
            end: 1000,
            duration: 1000 - 0,
            customAttributes: {}
          })
        })

        test('start - undefined, end - number', () => {
          const measurements = agent.measure('testMeasure', { end: 1000 })
          expect(measurements).toEqual({
            start: 0,
            end: 1000,
            duration: 1000 - 0,
            customAttributes: {}
          })
        })

        test('start - PerformanceMark, end - PerformanceMark', () => {
          const measurements = agent.measure('testMeasure', { start: dummyMark('startMark', 1000), end: dummyMark('endMark', 2000) })
          expect(measurements).toEqual({
            start: 1000,
            end: 2000,
            duration: 2000 - 1000,
            customAttributes: {}
          })
        })

        test('start - number, end - PerformanceMark', () => {
          const measurements = agent.measure('testMeasure', { start: 1000, end: dummyMark('endMark', 2000) })
          expect(measurements).toEqual({
            start: 1000,
            end: 2000,
            duration: 2000 - 1000,
            customAttributes: {}
          })
        })

        test('start - PerformanceMark, end - number', () => {
          const measurements = agent.measure('testMeasure', { start: dummyMark('startMark', 1000), end: 2000 })
          expect(measurements).toEqual({
            start: 1000,
            end: 2000,
            duration: 2000 - 1000,
            customAttributes: {}
          })
        })

        test('custom attributes', () => {
          const measurements = agent.measure('testMeasure', { customAttributes: { foo: 'bar' } })
          expect(measurements.customAttributes).toEqual({ foo: 'bar' }
          )
        })
      })
    })
  })

  describe('setTopLevelCallers', () => {
    afterEach(() => {
      jest.clearAllMocks()
      delete global.NREUM
    })
    test('should add expected api methods to global NREUM', () => {
      const mockAgent = {
        exposed: true,
        runtime: {
          loaderType: 'browser-agent'
        },
        setErrorHandler: jest.fn(),
        finished: jest.fn(),
        addToTrace: jest.fn(),
        addRelease: jest.fn(),
        addPageAction: jest.fn(),
        recordCustomEvent: jest.fn(),
        setCurrentRouteName: jest.fn(),
        setPageViewName: jest.fn(),
        setCustomAttribute: jest.fn(),
        interaction: jest.fn(),
        noticeError: jest.fn(),
        setUserId: jest.fn(),
        setApplicationVersion: jest.fn(),
        start: jest.fn(),
        recordReplay: jest.fn(),
        pauseReplay: jest.fn(),
        log: jest.fn(),
        wrapLogger: jest.fn(),
        register: jest.fn(),
        measure: jest.fn()
      }
      setTopLevelCallers(mockAgent)
      const nreum = gosCDN()

      const apiKeysNeedingMatch = Object.keys(mockAgent).filter(key => key !== 'exposed' && key !== 'runtime')
      Object.keys(nreum).forEach(key => {
        const match = apiKeysNeedingMatch.findIndex(apiKey => apiKey === key)
        if (match >= 0) apiKeysNeedingMatch.splice(match, 1)
      })

      expect(apiKeysNeedingMatch).toEqual([])
      expect(typeof nreum.setErrorHandler).toEqual('function')
      expect(typeof nreum.finished).toEqual('function')
      expect(typeof nreum.addToTrace).toEqual('function')
      expect(typeof nreum.addRelease).toEqual('function')
      expect(typeof nreum.addPageAction).toEqual('function')
      expect(typeof nreum.recordCustomEvent).toEqual('function')
      expect(typeof nreum.setCurrentRouteName).toEqual('function')
      expect(typeof nreum.setPageViewName).toEqual('function')
      expect(typeof nreum.setCustomAttribute).toEqual('function')
      expect(typeof nreum.interaction).toEqual('function')
      expect(typeof nreum.noticeError).toEqual('function')
      expect(typeof nreum.setUserId).toEqual('function')
      expect(typeof nreum.setApplicationVersion).toEqual('function')
      expect(typeof nreum.start).toEqual('function')
      expect(typeof nreum.recordReplay).toEqual('function')
      expect(typeof nreum.pauseReplay).toEqual('function')
      expect(typeof nreum.log).toEqual('function')
      expect(typeof nreum.wrapLogger).toEqual('function')
      expect(typeof nreum.register).toEqual('function')
      expect(typeof nreum.measure).toEqual('function')
    })

    test('should forward calls to the first initialized and exposed agent that is not a micro-agent', () => {
      const nreum = gosCDN()
      nreum.initializedAgents = {
        [faker.string.uuid()]: {
          exposed: true,
          setErrorHandler: jest.fn(),
          runtime: {
            loaderType: 'micro-agent'
          }
        },
        [faker.string.uuid()]: {
          exposed: true,
          setErrorHandler: jest.fn(),
          runtime: {
            loaderType: 'browser-agent'
          }
        },
        [faker.string.uuid()]: {
          exposed: true,
          setErrorHandler: jest.fn(),
          runtime: {
            loaderType: 'browser-agent'
          }
        },
        [faker.string.uuid()]: {
          exposed: false,
          setErrorHandler: jest.fn(),
          runtime: {
            loaderType: 'browser-agent'
          }
        }
      }

      const errorHandler = jest.fn()

      Object.values(nreum.initializedAgents).forEach((agent, i) => {
        setTopLevelCallers(agent)
      })

      nreum.setErrorHandler(errorHandler)

      Object.values(nreum.initializedAgents).forEach((agent, i) => {
        if (agent.exposed && agent.runtime.loaderType === 'browser-agent') {
          expect(agent.setErrorHandler).toHaveBeenCalledTimes(1)
          expect(agent.setErrorHandler).toHaveBeenCalledWith(errorHandler)
        } else {
          expect(agent.setErrorHandler).not.toHaveBeenCalled()
        }
      })
    })

    test('should return a single value for the first exposed browser-agent in the nreum initialized agents array', () => {
      const nreum = gosCDN()
      const expected = faker.string.uuid()
      nreum.initializedAgents = {
        [faker.string.uuid()]: {
          exposed: true,
          interaction: jest.fn().mockReturnValue(expected),
          runtime: {
            loaderType: 'browser-agent'
          }
        },
        [faker.string.uuid()]: {
          exposed: true,
          interaction: jest.fn().mockReturnValue(expected),
          runtime: {
            loaderType: 'browser-agent'
          }
        },
        [faker.string.uuid()]: {
          exposed: false,
          interaction: jest.fn().mockReturnValue(expected),
          runtime: {
            loaderType: 'browser-agent'
          }
        }
      }

      Object.values(nreum.initializedAgents).forEach((agent, i) => {
        setTopLevelCallers(agent)
      })
      const result = nreum.interaction()

      expect(result).toEqual(expected)
    })
  })
})

async function initializeFeature (InstrumentModule, agent) {
  const instrumenteModule = new InstrumentModule(agent)
  await new Promise(process.nextTick)
  const aggregateModule = instrumenteModule.featAggregate

  return { instrumenteModule, aggregateModule }
}

function expectHandled (tag, args, shouldBeEmitted = true) {
  expectMessage(handleModule.handle.mock.calls, tag, args, shouldBeEmitted)
}

function expectEmitted (tag, args, shouldBeEmitted = true) {
  expectMessage(agent.ee.emit.mock.calls, tag, args, shouldBeEmitted)
}

function expectMessage (calls, tag, args, shouldBeEmitted = true) {
  const match = calls.find(callArr => callArr[0] === tag && !callArr.checked)
  if (shouldBeEmitted) expect(match).toBeTruthy()
  else expect(match).toBeFalsy()
  if (!match) return
  match.checked = true
  if (args) expect(match[1]).toEqual(args)
}
