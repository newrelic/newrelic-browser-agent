import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { setRuntime } from '../../../src/common/config/config'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { SessionEntity } from '../../../src/common/session/session-entity'
import { TimeKeeper } from '../../../src/common/timing/time-keeper'
import { setNREUMInitializedAgent } from '../../../src/common/window/nreum'
import { configure } from '../../../src/loaders/configure/configure'
import { LocalMemory } from '../session-helpers'
import * as utils from '../../../src/features/logging/shared/utils'
import { wrapLogger } from '../../../src/common/wrap/wrap-logger'

let agentIdentifier, LoggingInstrument, session, timeKeeper, instanceEE

describe('logging instrument component tests', () => {
  beforeEach(async () => {
    agentIdentifier = (Math.random() + 1).toString(36).substring(7)
    instanceEE = ee.get(agentIdentifier)
    jest.spyOn(instanceEE, 'emit')
    jest.spyOn(instanceEE, 'on')
    jest.spyOn(instanceEE, 'buffer')
    jest.spyOn(utils, 'bufferLog')
    const { Instrument } = await import('../../../src/features/logging/instrument')
    LoggingInstrument = Instrument
    primeTest()
  })

  afterEach(async () => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })
  it('should subscribe to wrap-logger events and buffer them', async () => {
    const onCalls = instanceEE.on.mock.calls.length
    const loggingInstrument = new LoggingInstrument(agentIdentifier, new Aggregator({}))
    expect(instanceEE.on).toHaveBeenCalledTimes(onCalls + 1)
    expect(instanceEE.on.mock.calls[instanceEE.on.mock.calls.length - 1]).toEqual(expect.arrayContaining(['wrap-logger-end']))

    const myLoggerSuite = {
      myTestLogger: jest.fn()
    }
    wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes: { args: 1 }, level: 'error' })
    expect(utils.bufferLog).toHaveBeenCalledTimes(0)
    myLoggerSuite.myTestLogger('message', { args: 2 })
    expect(utils.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, 'message', { args: 1 }, 'error')
  })

  it('should get latest context from wrapLogger', async () => {
    const onCalls = instanceEE.on.mock.calls.length
    const loggingInstrument = new LoggingInstrument(agentIdentifier, new Aggregator({}))
    expect(instanceEE.on).toHaveBeenCalledTimes(onCalls + 1)
    expect(instanceEE.on.mock.calls[instanceEE.on.mock.calls.length - 1]).toEqual(expect.arrayContaining(['wrap-logger-end']))

    const myLoggerSuite = {
      myTestLogger: jest.fn()
    }
    wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes: { args: 1 }, level: 'error' })
    expect(utils.bufferLog).toHaveBeenCalledTimes(0)
    myLoggerSuite.myTestLogger('message', { args: 2 })
    expect(utils.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, 'message', { args: 1 }, 'error') // ignores args: 2
    /** re-wrap the logger with a NEW context, new events should get that context now */
    wrapLogger(loggingInstrument.ee, myLoggerSuite, 'myTestLogger', { customAttributes: { args: 'abc' }, level: 'info' })
    myLoggerSuite.myTestLogger('message', { args: 2 })
    expect(utils.bufferLog).toHaveBeenCalledWith(loggingInstrument.ee, 'message', { args: 'abc' }, 'info')
  })
})

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
