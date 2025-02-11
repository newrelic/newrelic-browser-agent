import { getRuntime } from '../../../src/common/config/runtime'
import { initialLocation } from '../../../src/common/constants/runtime'
import { LOGGING_EVENT_EMITTER_CHANNEL } from '../../../src/features/logging/constants'
import { Instrument as Logging } from '../../../src/features/logging/instrument'
import { Log } from '../../../src/features/logging/shared/log'
import * as consoleModule from '../../../src/common/util/console'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { resetAgent, setupAgent } from '../setup-agent'
import { getInfo } from '../../../src/common/config/info'

import { faker } from '@faker-js/faker'

let mainAgent, info, runtime

beforeAll(async () => {
  mainAgent = setupAgent()
  info = getInfo(mainAgent.agentIdentifier)
  runtime = getRuntime(mainAgent.agentIdentifier)
})

let loggingAggregate

beforeEach(async () => {
  jest.spyOn(handleModule, 'handle')
  jest.spyOn(consoleModule, 'warn').mockImplementation(() => {})

  const loggingInstrument = new Logging(mainAgent)
  await new Promise(process.nextTick)
  loggingAggregate = loggingInstrument.featAggregate
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

describe('class setup', () => {
  test('should have expected public properties', () => {
    expect(Object.keys(loggingAggregate)).toEqual(expect.arrayContaining([
      'agentIdentifier',
      'ee',
      'featureName',
      'blocked',
      'events'
    ]))
  })

  test('should wait for flags', async () => {
    expect(loggingAggregate.drained).toBeUndefined()
    loggingAggregate.ee.emit('rumresp', {})
    await new Promise(process.nextTick)
    expect(loggingAggregate.drained).toEqual(true)
  })
})

describe('payloads', () => {
  beforeEach(async () => {
    loggingAggregate.ee.emit('rumresp', {})
    await new Promise(process.nextTick)
  })

  test('fills buffered logs with event emitter messages and prepares matching payload', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', { myAttributes: 1 }, 'error'])

    const timeKeeper = getRuntime(mainAgent.agentIdentifier).timeKeeper
    const expectedLog = new Log(
      Math.floor(timeKeeper.correctAbsoluteTimestamp(
        timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { myAttributes: 1 },
      'error'
    )
    expect(loggingAggregate.events.get()[0].data[0]).toEqual(expectedLog)

    expect(loggingAggregate.makeHarvestPayload()[0].payload).toEqual({
      qs: { browser_monitoring_key: info.licenseKey },
      body: [{
        common: {
          attributes: {
            'instrumentation.name': 'browser-test',
            'instrumentation.provider': 'browser',
            'instrumentation.version': expect.any(String),
            'entity.guid': runtime.appMetadata.agents[0].entityGuid,
            session: runtime.session.state.value,
            hasReplay: false,
            hasTrace: false,
            ptid: mainAgent.agentIdentifier,
            appId: info.applicationID,
            standalone: false,
            agentVersion: expect.any(String)
          }
        },
        logs: [expectedLog]
      }]
    })
  })

  test('prepares payload as expected', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', { myAttributes: 1 }, 'error'])

    expect(loggingAggregate.events.get()[0].data[0]).toEqual(new Log(
      Math.floor(runtime.timeKeeper.correctAbsoluteTimestamp(
        runtime.timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { myAttributes: 1 },
      'error'
    ))
  })

  test('short circuits if log is too big', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(1024 * 1024), { myAttributes: 1 }, 'ERROR'])

    expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Failed/Seen', expect.any(Number)], undefined, 'metrics', loggingAggregate.ee)
    expect(handleModule.handle).toHaveBeenCalledTimes(1)
    expect(consoleModule.warn).toHaveBeenCalledWith(31, 'xxxxxxxxxxxxxxxxxxxxxxxxx...')

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'short message, long attrs', { myAttributes: 'x'.repeat(1024 * 1024) }, 'ERROR'])
    expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Failed/Seen', expect.any(Number)], undefined, 'metrics', loggingAggregate.ee)
    expect(handleModule.handle).toHaveBeenCalledTimes(2)
    expect(consoleModule.warn).toHaveBeenCalledWith(31, 'short message, long attrs...')
  })

  test('should short circuit if message is falsy', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, '', { myAttributes: 1 }, 'ERROR'])

    expect(consoleModule.warn).toHaveBeenCalledWith(32)
  })

  test('should short circuit if log level is invalid', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, '', { myAttributes: 1 }, 'BAD_LEVEL'])

    expect(consoleModule.warn).toHaveBeenCalledWith(30, 'BAD_LEVEL')
  })

  test('invalid custom attributes', async () => {
    const expected = new Log(
      Math.floor(runtime.timeKeeper.correctAbsoluteTimestamp(
        runtime.timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { },
      'error'
    )

    const logs = loggingAggregate.events.get()[0].data

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', [], 'ERROR'])
    expect(logs.pop()).toEqual(expected)

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', true, 'ERROR'])
    expect(logs.pop()).toEqual(expected)

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', 1, 'ERROR'])
    expect(logs.pop()).toEqual(expected)

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', 'string', 'ERROR'])
    expect(logs.pop()).toEqual(expected)
  })

  test('should work if log level is valid but wrong case', async () => {
    const expected = new Log(
      Math.floor(runtime.timeKeeper.correctAbsoluteTimestamp(
        runtime.timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { },
      'error'
    )

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', {}, 'ErRoR'])
    expect(loggingAggregate.events.get()[0].data[0]).toEqual(expected)
  })

  test('should buffer logs with non-stringify-able message', async () => {
    const logs = loggingAggregate.events.get()[0].data
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, new Error('test'), {}, 'error'])
    expect(logs.pop().message).toEqual('Error: test')

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, new SyntaxError('test'), {}, 'error'])
    expect(logs.pop().message).toEqual('SyntaxError: test')

    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, Symbol('test'), {}, 'error'])
    expect(logs.pop().message).toEqual('Symbol(test)')
  })

  test('initialLocation should be in pageUrl of log object attributes', async () => {
    const currentUrl = faker.internet.url()
    jest.spyOn(window, 'location', 'get').mockReturnValue(currentUrl)

    const log = new Log(
      Math.floor(runtime.timeKeeper.correctAbsoluteTimestamp(
        runtime.timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { },
      'error'
    )
    const expected = initialLocation.toString()

    expect(log.attributes.pageUrl).toEqual(expected)
  })
})

test('can harvest early', async () => {
  loggingAggregate.ee.emit('rumresp', {})
  await new Promise(process.nextTick)

  jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor')

  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
  expect(handleModule.handle).toHaveBeenCalledTimes(0)
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
  expect(handleModule.handle).toHaveBeenCalledTimes(1)
  expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Early/Seen', expect.any(Number)], undefined, 'metrics', loggingAggregate.ee)
  expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalled()
})
