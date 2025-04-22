import { initialLocation } from '../../../src/common/constants/runtime'
import { LOG_LEVELS, LOGGING_EVENT_EMITTER_CHANNEL, LOGGING_MODE } from '../../../src/features/logging/constants'
import { Instrument as Logging } from '../../../src/features/logging/instrument'
import { Log } from '../../../src/features/logging/shared/log'
import * as consoleModule from '../../../src/common/util/console'
import * as handleModule from '../../../src/common/event-emitter/handle'
import { resetAgent, setupAgent } from '../setup-agent'

import { faker } from '@faker-js/faker'

let mainAgent

beforeAll(async () => {
  mainAgent = setupAgent()
  /** mock response from PVE that assigns an entityGuid to the entity manager */
  mainAgent.runtime.entityManager.set(
    mainAgent.runtime.appMetadata.agents[0].entityGuid,
    { licenseKey: mainAgent.info.licenseKey, applicationID: mainAgent.info.applicationID, entityGuid: mainAgent.runtime.appMetadata.agents[0].entityGuid }
  )
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

const mockLoggingRumResponse = async (mode) => {
  loggingAggregate.ee.emit('rumresp', [{
    log: mode
  }])
  return await new Promise(process.nextTick)
}

describe('class setup', () => {
  test('should have expected public properties', () => {
    expect(Object.keys(loggingAggregate)).toEqual(expect.arrayContaining([
      'agentIdentifier',
      'ee',
      'featureName',
      'blocked',
      'agentRef',
      'obfuscator',
      'harvestOpts'
    ]))
  })

  test('should wait for flags - log flag is missing', async () => {
    expect(loggingAggregate.drained).toBeUndefined()
    loggingAggregate.ee.emit('rumresp', [{}])
    await new Promise(process.nextTick)
    expect(loggingAggregate.blocked).toEqual(true)
  })

  test('should wait for flags - 0 = OFF', async () => {
    expect(loggingAggregate.drained).toBeUndefined()
    await mockLoggingRumResponse(LOGGING_MODE.OFF)

    expect(loggingAggregate.blocked).toEqual(true)
  })

  test('should wait for flags - 1 = ERROR', async () => {
    expect(loggingAggregate.drained).toBeUndefined()
    await mockLoggingRumResponse(LOGGING_MODE.ERROR)

    expect(loggingAggregate.drained).toEqual(true)
  })
})

describe('payloads', () => {
  beforeEach(() => {
    mockLoggingRumResponse(LOGGING_MODE.INFO)
  })

  test('fills buffered logs with event emitter messages and prepares matching payload', async () => {
    loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', { myAttributes: 1 }, 'error'])

    const timeKeeper = mainAgent.runtime.timeKeeper
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
      qs: { browser_monitoring_key: mainAgent.info.licenseKey },
      body: [{
        common: {
          attributes: {
            'instrumentation.name': 'browser-test',
            'instrumentation.provider': 'browser',
            'instrumentation.version': expect.any(String),
            'entity.guid': mainAgent.runtime.appMetadata.agents[0].entityGuid,
            session: mainAgent.runtime.session.state.value,
            hasReplay: false,
            hasTrace: false,
            ptid: mainAgent.agentIdentifier,
            appId: mainAgent.info.applicationID,
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
      Math.floor(mainAgent.runtime.timeKeeper.correctAbsoluteTimestamp(
        mainAgent.runtime.timeKeeper.convertRelativeTimestamp(1234)
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
      Math.floor(mainAgent.runtime.timeKeeper.correctAbsoluteTimestamp(
        mainAgent.runtime.timeKeeper.convertRelativeTimestamp(1234)
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
      Math.floor(mainAgent.runtime.timeKeeper.correctAbsoluteTimestamp(
        mainAgent.runtime.timeKeeper.convertRelativeTimestamp(1234)
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
      Math.floor(mainAgent.runtime.timeKeeper.correctAbsoluteTimestamp(
        mainAgent.runtime.timeKeeper.convertRelativeTimestamp(1234)
      )),
      'test message',
      { },
      'error'
    )
    const expected = initialLocation.toString()

    expect(log.attributes.pageUrl).toEqual(expected)
  })
})

test.each(Object.keys(LOGGING_MODE))('payloads - log events are emitted (or not) according to flag from rum response - %s', async (logLevel) => {
  const SOME_TIMESTAMP = 1234
  await mockLoggingRumResponse(LOGGING_MODE[logLevel])
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [SOME_TIMESTAMP, LOG_LEVELS.ERROR, { myAttributes: 1 }, LOG_LEVELS.ERROR])
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [SOME_TIMESTAMP, LOG_LEVELS.WARN, { myAttributes: 1 }, LOG_LEVELS.WARN])
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [SOME_TIMESTAMP, LOG_LEVELS.INFO, { myAttributes: 1 }, LOG_LEVELS.INFO])
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [SOME_TIMESTAMP, LOG_LEVELS.DEBUG, { myAttributes: 1 }, LOG_LEVELS.DEBUG])
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [SOME_TIMESTAMP, LOG_LEVELS.TRACE, { myAttributes: 1 }, LOG_LEVELS.TRACE])

  expect(loggingAggregate.events.get()[0].data.length).toEqual(LOGGING_MODE[logLevel])
  loggingAggregate.events.clear()
})

test('can harvest early', async () => {
  await mockLoggingRumResponse(LOGGING_MODE.INFO)

  jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor')

  const harvestEarlySm = ['storeSupportabilityMetrics', ['Logging/Harvest/Early/Seen', expect.any(Number)], undefined, 'metrics', loggingAggregate.ee]

  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
  expect(handleModule.handle).not.toHaveBeenCalledWith(...harvestEarlySm)
  loggingAggregate.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
  expect(handleModule.handle).toHaveBeenCalledWith(...harvestEarlySm)
  expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalled()
})

test('should not error if aborting before events have been set', async () => {
  delete loggingAggregate.events
  expect(() => loggingAggregate.abort()).not.toThrow()
})
