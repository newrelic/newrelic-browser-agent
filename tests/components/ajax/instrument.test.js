import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { Aggregator } from '../../../src/common/aggregate/aggregator'

window.fetch = jest.fn(() => Promise.resolve())
window.Request = jest.fn()
window.Response = jest.fn()
const { Ajax } = require('../../../src/features/ajax') // don't hoist this up with ES6 import

jest.mock('../../../src/common/constants/runtime')
jest.mock('../../../src/common/config/config', () => ({
  __esModule: true,
  originals: { REQ: jest.fn(), XHR: global.XMLHttpRequest },
  getConfigurationValue: jest.fn(),
  getLoaderConfig: jest.fn().mockReturnValue({})
}))
const agentIdentifier = 'abcdefg'
let baseEE

beforeAll(() => {
  const ajaxInstrument = new Ajax(agentIdentifier, new Aggregator({ agentIdentifier, ee }), false)
  baseEE = ajaxInstrument.ee
})

describe('Ajax event is not captured or buffered for data urls', () => {
  let xhrEventLogged
  beforeAll(() => { baseEE.on('xhr', monitorXhrEvent) })
  beforeEach(() => { xhrEventLogged = false })
  afterAll(() => { baseEE.removeEventListener('xhr', monitorXhrEvent) })

  test('XMLHttpRequest', done => {
    expect.assertions(2)
    baseEE.on('send-xhr-start', validateIsDataProtocol)

    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        setTimeout(() => { // the following has to wait for next loop so monitorXhrEvent can run
          expect(xhrEventLogged).toEqual(false)
          baseEE.removeEventListener('send-xhr-start', validateIsDataProtocol)
          done()
        }, 0)
      }
    }
    xhr.send()
  })
  test('fetch', done => {
    expect.assertions(2)
    baseEE.on('fetch-done', validateIsDataProtocol)

    fetch('data:,dataUrl').then(() => {
      expect(xhrEventLogged).toEqual(false)
      baseEE.removeEventListener('fetch-done', validateIsDataProtocol)
      done()
    })
  })

  function validateIsDataProtocol (args, xhr) { expect(this.params.protocol).toEqual('data') }
  function monitorXhrEvent (params, metrics, start) { xhrEventLogged = true }
})
