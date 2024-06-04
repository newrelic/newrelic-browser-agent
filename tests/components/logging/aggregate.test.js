import { SessionEntity } from '../../../src/common/session/session-entity'
import { TimeKeeper } from '../../../src/common/timing/time-keeper'
import { setNREUMInitializedAgent } from '../../../src/common/window/nreum'
import { configure } from '../../../src/loaders/configure/configure'
import { LocalMemory } from '../session-helpers'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { setRuntime } from '../../../src/common/config/config'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { LOGGING_EVENT_EMITTER_TYPES } from '../../../src/features/logging/constants'
import { Log } from '../../../src/features/logging/shared/log'

jest.mock('../../../src/common/util/console', () => ({
  warn: jest.fn()
}))

let agentIdentifier, LoggingAggregate, session, timeKeeper
describe('logging aggregate component tests', () => {
  beforeEach(async () => {
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
      expect(Object.keys(loggingAgg)).toEqual(['agentIdentifier', 'aggregator', 'ee', 'featureName', 'blocked', 'bufferedLogs', 'outgoingLogs', 'harvestTimeSeconds'])
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
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_TYPES.LOG, [1234, 'test message', { myAttributes: 1 }, 'error'])
      const expectedLog = new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { myAttributes: 1 },
        'error'
      )
      expect(loggingAgg.bufferedLogs[0]).toEqual(expectedLog)

      expect(loggingAgg.prepareHarvest()).toEqual({
        qs: { browser_monitoring_key: 1234 },
        body: {
          common: {
            attributes: {
              entityGuid: 'testEntityGuid',
              session: {
                id: session.state.value, // The session ID that we generate and keep across page loads
                hasReplay: false, // True if a session replay recording is running
                hasTrace: false, // True if a session trace recording is running
                pageTraceId: agentIdentifier // The trace ID if a session trace is recording
              },
              agent: {
                appId: 9876, // Application ID from info object
                standalone: 0, // Whether the app is C+P or APM injected
                version: expect.any(String), // the browser agent version
                distribution: expect.any(String) // How is the agent being loaded on the page
              }
            }
          },
          logs: [expectedLog]
        }
      })
    })

    it('prepares payload as expected', async () => {
      const loggingAgg = new LoggingAggregate(agentIdentifier, new Aggregator({}))
      loggingAgg.ee.emit('rumresp', {})
      await wait(1)
      loggingAgg.ee.emit(LOGGING_EVENT_EMITTER_TYPES.LOG, [1234, 'test message', { myAttributes: 1 }, 'error'])
      expect(loggingAgg.bufferedLogs[0]).toEqual(new Log(
        timeKeeper.convertRelativeTimestamp(1234),
        'test message',
        { myAttributes: 1 },
        'error'
      ))
    })
  })
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
