import * as handleModule from '../../../src/common/event-emitter/handle'
import { setupAgent } from '../setup-agent'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'

let mainAgent

beforeAll(async () => {
  jest.spyOn(handleModule, 'handle')

  mainAgent = setupAgent({
    info: {
      beacon: 'some-agent-endpoint.com:1234'
    }
  })
})

let ajaxInstrument
let handleSpy

beforeEach(async () => {
  handleSpy = jest.spyOn(handleModule, 'handle')

  ajaxInstrument = new Ajax(mainAgent)
  jest.spyOn(ajaxInstrument.ee, 'emit')
})

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('ajax event is not captured or buffered for data urls', () => {
  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()

    const xhrContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'new-xhr' && call[1][0] === xhr)[2]
    expect(xhrContext.params.protocol).toEqual('data')
    expect(handleModule.handle).not.toHaveBeenCalledWith('xhr', expect.any(Array), xhrContext, FEATURE_NAMES.ajax)
  })

  test('fetch', async () => {
    await fetch('data:,dataUrl')

    const fetchContext = jest.mocked(ajaxInstrument.ee.emit).mock.calls
      .find(call => call[0] === 'fetch-done')[2]
    expect(fetchContext.params.protocol).toEqual('data')
    expect(handleModule.handle).not.toHaveBeenCalledWith('xhr', expect.any(Array), fetchContext, FEATURE_NAMES.ajax)
  })
})

describe('non-agent xhr/fetch calls re-emit "netReq" events', () => {
  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()

    expect(handleSpy).toHaveBeenCalledWith('netReq', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
  })

  test('fetch', async () => {
    await fetch('data:,dataUrl')

    expect(handleSpy).toHaveBeenCalledWith('netReq', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
  })
})

describe('agent xhr/fetch calls do not re-emit "netReq" events', () => {
  test('XMLHttpRequest', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://some-agent-endpoint.com:1234')
    xhr.send()

    expect(handleSpy).not.toHaveBeenCalledWith('netReq', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
  })

  test('fetch', async () => {
    await fetch('https://some-agent-endpoint.com:1234')

    expect(handleSpy).not.toHaveBeenCalledWith('netReq', [], undefined, FEATURE_NAMES.genericEvents, expect.any(Object))
  })
})
