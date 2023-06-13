import { HandlerCache } from './handler-cache'

jest.useFakeTimers()

test('should immediately invoke handler when decision has already been made and is true', () => {
  const handlerCache = new HandlerCache()
  handlerCache.decide(true)

  const handler = jest.fn()
  handlerCache.settle(handler)

  expect(handler).toHaveBeenCalled()
})

test('should not invoke handler when decision has already been made and is false', () => {
  const handlerCache = new HandlerCache()
  handlerCache.decide(false)

  const handler = jest.fn()
  handlerCache.settle(handler)

  expect(handler).not.toHaveBeenCalled()
})

test('should cache the handler until a decision is made', () => {
  const handlerCache = new HandlerCache()

  const handler = jest.fn()
  handlerCache.settle(handler)
  expect(handler).not.toHaveBeenCalled()

  handlerCache.decide(true)
  expect(handler).toHaveBeenCalled()
})

test('should not invoke handler when decision times out', () => {
  const handlerCache = new HandlerCache()
  jest.advanceTimersByTime(10000)

  const handler = jest.fn()
  handlerCache.settle(handler)

  expect(handler).not.toHaveBeenCalled()
})

test('should clear the timeout when a decision is made', () => {
  jest.spyOn(global, 'setTimeout')
  jest.spyOn(global, 'clearTimeout')

  const handlerCache = new HandlerCache()

  const handler = jest.fn()
  handlerCache.settle(handler)
  handlerCache.decide(true)

  const timeout = jest.mocked(global.setTimeout).mock.results[0].value
  expect(global.clearTimeout).toHaveBeenCalledWith(timeout)
})

test('should not allow another decision after a permanent one', () => {
  jest.spyOn(global, 'clearTimeout')

  const handlerCache = new HandlerCache()

  const handler = jest.fn()
  handlerCache.settle(handler)
  handlerCache.permanentlyDecide(false)
  handlerCache.decide(true)

  expect(global.clearTimeout).toHaveBeenCalledTimes(1)
  expect(handler).not.toHaveBeenCalled()
})
