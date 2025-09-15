import * as handleModule from '../../../src/common/event-emitter/handle'
import { setupAgent } from '../setup-agent'
import { Instrument as Ajax } from '../../../src/features/ajax/instrument'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'

let mainAgent

beforeAll(async () => {
  jest.spyOn(handleModule, 'handle')

  mainAgent = setupAgent()
})

let ajaxInstrument

beforeEach(async () => {
  ajaxInstrument = new Ajax(mainAgent)
  jest.spyOn(ajaxInstrument.ee, 'emit')
})

afterEach(() => {
  jest.clearAllMocks()
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
