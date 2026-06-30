import { Instrument as SessionTrace } from '../../../src/features/session_trace/instrument'
import { resetAgent, setupAgent } from '../setup-agent'
import { MODE } from '../../../src/common/session/constants'

let mainAgent

jest.retryTimes(0)

beforeAll(() => {
  mainAgent = setupAgent()
})

let sessionTraceAggregate, session

beforeEach(async () => {
  const sessionTraceInstrument = new SessionTrace(mainAgent)
  await new Promise(process.nextTick)
  sessionTraceAggregate = sessionTraceInstrument.featAggregate
  session = mainAgent.runtime.session
})

afterEach(() => {
  resetAgent(mainAgent)
  jest.clearAllMocks()
})

const mockRumResponse = async (entitled, mode) => {
  sessionTraceAggregate.ee.emit('rumresp', [{
    st: entitled,
    sts: mode
  }])
  return await new Promise((resolve, reject) => {
    setTimeout(resolve, 100) // wait for the feature to initialize
  })
  // return await new Promise(process.nextTick)
}

describe('session trace - modes ', () => {
  test.each(Object.keys(MODE))('should match ST mode -- %s', async (key) => {
    session.isNew = false
    const mode = MODE[key]
    await mockRumResponse(1, mode)

    expect(sessionTraceAggregate.blocked).toEqual(false)
    expect(sessionTraceAggregate.mode).toEqual(mode)
    expect(session.state.sessionTraceMode).toEqual(mode)
    const localStorageSessionState = session.read()
    expect(localStorageSessionState.sessionTraceMode).toEqual(mode)
  })

  test('session ST mode is OFF and ST is blocked when not entitled -- FULL', async () => {
    session.isNew = false
    await mockRumResponse(0, MODE.FULL)

    expect(sessionTraceAggregate.blocked).toEqual(true)
    expect(sessionTraceAggregate.mode).toEqual(MODE.OFF)
    expect(session.state.sessionTraceMode).toEqual(MODE.OFF)
  })

  test('session ST mode is OFF and ST is blocked when not entitled -- ERROR', async () => {
    session.isNew = false
    await mockRumResponse(0, MODE.ERROR)

    expect(sessionTraceAggregate.blocked).toEqual(true)
    expect(sessionTraceAggregate.mode).toEqual(MODE.OFF)
    expect(session.state.sessionTraceMode).toEqual(MODE.OFF)
  })
})
