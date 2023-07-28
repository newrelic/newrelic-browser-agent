import { setTopLevelCallers, setAPI } from './api'
import { gosCDN } from '../../common/window/nreum'

jest.enableAutomock()
jest.unmock('./api')

describe('setTopLevelCallers', () => {
  beforeEach(() => {
    delete gosCDN().initializedAgents
  })

  test('adds all api methods', () => {
    setTopLevelCallers()

    expect(Object.keys(gosCDN()).length).toEqual(15)
  })

  test('and runs the corresponding fn under every exposed agent', () => {
    let newrelic = gosCDN()
    newrelic.initializedAgents = {
      abcd: { exposed: true, api: { noticeError: jest.fn() } },
      efgh: { exposed: false, api: { noticeError: jest.fn() } },
      ijkl: { exposed: true, api: { noticeError: jest.fn() } }
    }

    const someArgs = ['wtfish', { bop: 'it' }]
    newrelic.noticeError(...someArgs)
    expect(newrelic.initializedAgents.abcd.api.noticeError).toHaveBeenCalledWith(...someArgs)
    expect(newrelic.initializedAgents.efgh.api.noticeError).not.toHaveBeenCalled()
    expect(newrelic.initializedAgents.ijkl.api.noticeError).toHaveBeenCalledWith(...someArgs)
  })

  test('fn call returns right number of results based on running agent(s)', () => {
    let newrelic = gosCDN()
    newrelic.initializedAgents = {
      abcd: { exposed: true, api: { interaction: jest.fn(() => 'duck') } }
    }
    let ret = newrelic.interaction()
    expect(ret).toEqual('duck')

    newrelic.initializedAgents.efgh = { exposed: true, api: { interaction: jest.fn(() => 'truck') } }
    ret = newrelic.interaction()
    expect(ret).toEqual(['duck', 'truck'])
  })
})

jest.unmock('../../common/event-emitter/contextual-ee')
jest.mock('../../common/constants/runtime', () => {
  return {
    __esModule: true,
    isBrowserScope: false
  }
})

describe('setAPI', () => {
  test('also adds all api methods', () => {
    let apiI = setAPI('abcd', true)

    expect(Object.keys(apiI).length).toEqual(15)
    for (const k of Object.keys(apiI)) { expect(apiI[k]).toBeInstanceOf(Function) }
  })

  test('sets up spa interaction api prototype/handle', () => {
    let apiI = setAPI('abcd', true)
    let interactionProto = Object.getPrototypeOf(apiI.interaction())

    expect(Object.keys(interactionProto).length).toEqual(10)
    for (const k of Object.keys(interactionProto)) { expect(interactionProto[k]).toBeInstanceOf(Function) }
  })

  test('calls asyncApi setAPI as well', async () => {
    jest.resetModules()
    let setApiCalled
    let asyncSetApi = new Promise(resolve => { setApiCalled = resolve })
    jest.doMock('./apiAsync', () => {
      return {
        __esModule: true,
        setAPI: jest.fn(id => setApiCalled(id))
      }
    })

    setAPI('abcd', true)
    await expect(asyncSetApi).resolves.toBe('abcd')
  })
})
