import { ee } from '../../../src/common/event-emitter/contextual-ee'
import * as nreumModule from '../../../src/common/window/nreum'

const origWebSocket = WebSocket
describe('wrap-websocket', () => {
  beforeEach(() => {
    global.WebSocket = origWebSocket
    jest.spyOn(nreumModule, 'gosNREUMOriginals').mockImplementation(() => ({ o: { WS: origWebSocket } }))
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should mutate global to match same properties as original', async () => {
    const ws = await prepWS()
    expect(WebSocket.name).toEqual('WebSocket')
    expect(typeof ws.send).toEqual('function')
    expect(typeof ws.close).toEqual('function')
    expect(ws.send.name).toEqual('send')
    expect(ws.close.name).toEqual('close')
    expect(typeof ws.addEventListener).toEqual('function')

    expect(ws.binaryType).toEqual('blob')
    expect(ws.bufferedAmount).toEqual(0)
    expect(ws.extensions).toEqual('')
    expect(ws.onclose).toEqual(null)
    expect(ws.onerror).toEqual(null)
    expect(ws.onmessage).toEqual(null)
    expect(ws.onopen).toEqual(null)
    expect(ws.protocol).toEqual('')
    expect(ws.readyState).toEqual(0)
    expect(ws.url).toEqual('ws://foo.com/websocket')

    expect(WebSocket.length).not.toBeUndefined()
    expect(WebSocket.CONNECTING).toEqual(0)
    expect(WebSocket.OPEN).toEqual(1)
    expect(WebSocket.CLOSING).toEqual(2)
    expect(WebSocket.CLOSED).toEqual(3)
  })

  it('should not run if no WS global', async () => {
    jest.spyOn(nreumModule, 'gosNREUMOriginals').mockImplementation(() => ({ o: { WS: undefined } }))
    await prepWS()
    expect(new WebSocket('ws://foo.com/websocket') instanceof origWebSocket).toEqual(true)
  })

  it('should generate data from event listeners', async () => {
    const events = []
    let latestTimestamp = 0
    let previousTimestamp = 0
    let latestRelativeTimestamp = 0
    let previousRelativeTimestamp = 0
    let expectedLength = 0

    const emitSpy = jest.spyOn(ee, 'emit')

    const handleWebsocketEvents = (suffix) => {
      ee.on('websocket-' + suffix, (...args) => {
        events.push(args)
        previousTimestamp = latestTimestamp
        latestTimestamp = args[0]
        previousRelativeTimestamp = latestRelativeTimestamp
        latestRelativeTimestamp = args[1]
        expect(++expectedLength).toEqual(events.length)
        expect(latestTimestamp).toBeGreaterThanOrEqual(previousTimestamp)
        expect(latestRelativeTimestamp).toBeGreaterThanOrEqual(previousRelativeTimestamp)
        expect(latestRelativeTimestamp).toBeLessThanOrEqual(latestTimestamp)
      })
    }
      ;['new', 'send', 'close', 'addEventListener'].forEach(handleWebsocketEvents)

    expect(events.length).toEqual(0)

    const expectedBaseData = [expect.any(Number), expect.any(Number), true, expect.any(String)]

    const ws = await prepWS()
    expect(events[expectedLength - 1]).toEqual([...expectedBaseData])
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy).toHaveBeenCalledWith('websocket-new', [...expectedBaseData])

    ws.send('test')
    expect(events[expectedLength - 1]).toEqual([...expectedBaseData, 'test'])
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0]).toEqual('websocket-send')

    ws.close()
    expect(events[expectedLength - 1]).toEqual([...expectedBaseData, 'test']) // close method is not observed directly, only by its event

    const messageEvent = new Event('message')
    messageEvent.data = 'this is a test'
    ws.dispatchEvent(messageEvent)
    expect(events[expectedLength - 1][4]).toMatchObject({ event: { data: 'this is a test' }, eventType: 'message' })
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0]).toEqual('websocket-addEventListener')

    ws.dispatchEvent(new Event('open'))
    expect(events[expectedLength - 1]).toEqual(expect.arrayContaining([
      ...expectedBaseData,
      expect.objectContaining({ eventType: 'open' })
    ]))
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0]).toEqual('websocket-addEventListener')

    ws.dispatchEvent(new Event('error'))
    expect(events[expectedLength - 1]).toEqual(expect.arrayContaining([
      ...expectedBaseData,
      expect.objectContaining({ eventType: 'error' })
    ]))
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0]).toEqual('websocket-addEventListener')

    ws.dispatchEvent(new Event('unsupported'))
    /** should have not changed */
    expect(events[expectedLength - 1]).toEqual(expect.arrayContaining([
      ...expectedBaseData,
      expect.objectContaining({ eventType: 'error' })
    ]))
    expect(emitSpy).toHaveBeenCalledTimes(expectedLength)
    expect(emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0]).toEqual('websocket-addEventListener')
  })
})

async function prepWS () {
  jest.spyOn(global.WebSocket.prototype, 'send').mockReturnValue(() => {})
  const { wrapWebSocket } = await import('../../../src/common/wrap/wrap-websocket')
  wrapWebSocket(ee)
  return new window.WebSocket('ws://foo.com/websocket')
}
