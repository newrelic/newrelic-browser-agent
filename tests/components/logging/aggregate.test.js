import { SessionEntity } from '../../../src/common/session/session-entity'
import { TimeKeeper } from '../../../src/common/timing/time-keeper'
import { setNREUMInitializedAgent } from '../../../src/common/window/nreum'
import { configure } from '../../../src/loaders/configure/configure'
import { LocalMemory } from '../session-helpers'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { setRuntime } from '../../../src/common/config/config'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { LOGGING_EVENT_EMITTER_CHANNEL } from '../../../src/features/logging/constants'

import { Log } from '../../../src/features/logging/shared/log'
import { warn } from '../../../src/common/util/console'
import * as handleModule from '../../../src/common/event-emitter/handle'

jest.mock('../../../src/common/util/console', () => ({
  warn: jest.fn()
}))

let agentIdentifier, LoggingAggregate, session, timeKeeper
describe('logging aggregate component tests', () => {
  beforeEach(async () => {
    jest.spyOn(handleModule, 'handle')
    agentIdentifier = (Math.random() + 1).toString(36).substring(7)
    const { Aggregate } = await import('../../../src/features/logging/aggregate')
    LoggingAggregate = Aggregate
    primeTest()
  })

  afterEach(async () => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  describe('class setup', () => {
    it('should have expected public properties', () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      expect(Object.keys(loggingAgg)).toEqual(expect.arrayContaining([
        'agentIdentifier',
        'aggregator',
        'ee',
        'featureName',
        'blocked',
        'bufferedLogs',
        'outgoingLogs',
        'harvestTimeSeconds',
        'estimatedBytes'
      ]))
    })

    it('should wait for flags', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      expect(loggingAgg.drained).toBeUndefined()

      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      expect(loggingAgg.drained).toEqual(true)
    })
  })

  describe('payloads', () => {
    it('fills buffered logs with event emitter messages and prepares matching payload', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', { myAttributes: 1 }, 'error'])

      const expectedLog = new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { myAttributes: 1 },
        'error'
      )
      expect(loggingAgg.bufferedLogs[0]).toEqual(expectedLog)

      expect(loggingAgg.prepareHarvest()).toEqual({
        qs: { browser_monitoring_key: 1234 },
        body: [{
          common: {
            attributes: {
              'entity.guid': 'testEntityGuid',
              session: session.state.value,
              hasReplay: false,
              hasTrace: false,
              ptid: agentIdentifier,
              appId: 9876,
              standalone: false,
              agentVersion: expect.any(String)
            }
          },
          logs: [expectedLog]
        }]
      })
    })

    it('prepares payload as expected', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', { myAttributes: 1 }, 'error'])
      expect(loggingAgg.bufferedLogs[0]).toEqual(new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { myAttributes: 1 },
        'error'
      ))
    })

    it('short circuits if log is too big', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(1024 * 1024), { myAttributes: 1 }, 'ERROR'])
      expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Failed/Seen', expect.any(Number)])
      expect(handleModule.handle).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(31, 'xxxxxxxxxxxxxxxxxxxxxxxxx...')
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'short message, long attrs', { myAttributes: 'x'.repeat(1024 * 1024) }, 'ERROR'])
      expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Failed/Seen', expect.any(Number)])
      expect(handleModule.handle).toHaveBeenCalledTimes(2)
      expect(warn).toHaveBeenCalledWith(31, 'short message, long attrs...')
    })

    it('should short circuit if message is falsy', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, '', { myAttributes: 1 }, 'ERROR'])

      expect(warn).toHaveBeenCalledWith(32)
    })

    it('should short circuit if log level is invalid', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, '', { myAttributes: 1 }, 'BAD_LEVEL'])

      expect(warn).toHaveBeenCalledWith(30, 'BAD_LEVEL')
    })

    it('invalid custom attributes', async () => {
      const expected = new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { },
        'error'
      )
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', [], 'ERROR'])
      expect(loggingAgg.bufferedLogs.pop()).toEqual(expected)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', true, 'ERROR'])
      expect(loggingAgg.bufferedLogs.pop()).toEqual(expected)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', 1, 'ERROR'])
      expect(loggingAgg.bufferedLogs.pop()).toEqual(expected)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', 'string', 'ERROR'])
      expect(loggingAgg.bufferedLogs.pop()).toEqual(expected)
    })

    it('should work if log level is valid but wrong case', async () => {
      const expected = new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { },
        'error'
      )
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'test message', {}, 'ErRoR'])
      expect(loggingAgg.bufferedLogs.pop()).toEqual(expected)
    })

    it('should buffer logs with non-stringify-able message', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, new Error('test'), {}, 'error'])
      expect(loggingAgg.bufferedLogs.pop().message).toEqual('Error: test')

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, new SyntaxError('test'), {}, 'error'])
      expect(loggingAgg.bufferedLogs.pop().message).toEqual('SyntaxError: test')

      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, Symbol('test'), {}, 'error'])
      expect(loggingAgg.bufferedLogs.pop().message).toEqual('Symbol(test)')
    })
  })

  it('can harvest early', async () => {
    const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
    loggingAgg.ee.emit('rumresp', {})
    await wait(1)
    jest.spyOn(loggingAgg.scheduler, 'runHarvest')
    loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
    expect(handleModule.handle).toHaveBeenCalledTimes(0)
    loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_CHANNEL, [1234, 'x'.repeat(800 * 800), { myAttributes: 1 }, 'ERROR']) // almost too big
    expect(handleModule.handle).toHaveBeenCalledTimes(1)
    expect(handleModule.handle).toHaveBeenCalledWith('storeSupportabilityMetrics', ['Logging/Harvest/Early/Seen', expect.any(Number)])
    expect(loggingAgg.scheduler.runHarvest).toHaveBeenCalled()
  })
  // })
})

function wait (ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function primeTest (sess = new SessionEntity({ agentIdentifier, key: 'SESSION', storage: new LocalMemory() })) {
  const agent = { agentIdentifier }
  const info = { licenseKey: 1234, applicationID: 9876, sa: 0 }
  setNREUMInitializedAgent(agentIdentifier, agent)
  session = sess
  configure(agent, { info, runtime: { session, isolatedBacklog: false }, init: {} }, 'test', true)

  timeKeeper = new TimeKeeper(agentIdentifier, ee.get(agentIdentifier))
  timeKeeper.processRumRequest({
    getResponseHeader: jest.fn(() => (new Date()).toUTCString())
  }, 450, 600)
  setRuntime(agentIdentifier, { timeKeeper, session: sess, isolatedBacklog: false, ptid: agentIdentifier, appMetadata: { agents: [{ entityGuid: 'testEntityGuid' }] } })
}
