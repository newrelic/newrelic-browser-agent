let runtimeModule
let wrapFunctionModule

beforeEach(async () => {
  runtimeModule = await import('../../../src/common/constants/runtime')
  wrapFunctionModule = await import('../../../src/common/wrap/wrap-function')
  const originalFnWrapper = wrapFunctionModule.createWrapperWithEmitter
  jest.spyOn(wrapFunctionModule, 'createWrapperWithEmitter').mockImplementation((...args) => {
    const result = originalFnWrapper.call(this, ...args)
    jest.spyOn(result, 'inPlace')
    return result
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.resetModules()
})

test('should not wrap when getPrototypeOf is not supported', async () => {
  const originalObject = global.Object
  global.Object = new Proxy(global.Object, {
    has (target, prop) {
      if (prop === 'getPrototypeOf') return false
      return Reflect.has(target, prop)
    }
  })

  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const fnWrapper = jest.mocked(wrapFunctionModule.createWrapperWithEmitter).mock.results[0].value

  expect(fnWrapper.inPlace).not.toHaveBeenCalled()
  expect(EventTarget.prototype.addEventListener[wrapFunctionModule.flag]).toBeUndefined()
  expect(EventTarget.prototype.removeEventListener[wrapFunctionModule.flag]).toBeUndefined()

  global.Object = originalObject
})

test('should wrap event emitters once', async () => {
  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()
  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const fnWrapper = jest.mocked(wrapFunctionModule.createWrapperWithEmitter).mock.results[0].value

  expect(fnWrapper.inPlace).toHaveBeenCalledTimes(3)
})

test('should attempt to wrap three objects when getPrototypeOf is supported', async () => {
  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const fnWrapper = jest.mocked(wrapFunctionModule.createWrapperWithEmitter).mock.results[0].value

  expect(wrapFunctionModule.createWrapperWithEmitter).toHaveBeenCalledTimes(1)
  expect(fnWrapper.inPlace).toHaveBeenCalledTimes(3)
})

test('should attempt to wrap two objects when not a browser scope', async () => {
  jest.replaceProperty(runtimeModule, 'isBrowserScope', false)

  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const fnWrapper = jest.mocked(wrapFunctionModule.createWrapperWithEmitter).mock.results[0].value

  expect(fnWrapper.inPlace).toHaveBeenCalledTimes(2)
})

test('should pass options as-is to addEventListener after wrapping', async () => {
  const handler1 = jest.fn()
  const handler2 = jest.fn()
  const handler3 = jest.fn()
  const handler4 = jest.fn()
  const handler5 = jest.fn()
  const handler6 = jest.fn()
  const handler7 = jest.fn()
  const handler8 = jest.fn()
  jest.spyOn(EventTarget.prototype, 'addEventListener')

  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const el = document.createElement('div')
  el.addEventListener('click', handler1, { capture: true })
  el.addEventListener('click', handler2, { capture: false })
  el.addEventListener('click', handler3, true)
  el.addEventListener('click', handler4, false)
  el.addEventListener('click', handler5, { once: true })
  el.addEventListener('click', handler6, { once: false })
  el.addEventListener('click', handler7, { passive: true })
  el.addEventListener('click', handler8, { passive: false })

  const event = new Event('click', { bubbles: true, cancelable: false })
  el.dispatchEvent(event)

  expect(handler1).toHaveBeenCalledTimes(1)
  expect(handler2).toHaveBeenCalledTimes(1)
  expect(handler3).toHaveBeenCalledTimes(1)
  expect(handler4).toHaveBeenCalledTimes(1)
  expect(handler5).toHaveBeenCalledTimes(1)
  expect(handler6).toHaveBeenCalledTimes(1)
  expect(handler7).toHaveBeenCalledTimes(1)
  expect(handler8).toHaveBeenCalledTimes(1)
  expect(EventTarget.prototype.addEventListener).toHaveBeenCalledTimes(8)
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(1, 'click', expect.any(Function), { capture: true })
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(2, 'click', expect.any(Function), { capture: false })
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(3, 'click', expect.any(Function), true)
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(4, 'click', expect.any(Function), false)
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(5, 'click', expect.any(Function), { once: true })
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(6, 'click', expect.any(Function), { once: false })
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(7, 'click', expect.any(Function), { passive: true })
  expect(EventTarget.prototype.addEventListener).toHaveBeenNthCalledWith(8, 'click', expect.any(Function), { passive: false })
})

test('should support removing event listeners after wrapping', async () => {
  const handler = jest.fn()
  jest.spyOn(EventTarget.prototype, 'addEventListener')
  jest.spyOn(EventTarget.prototype, 'removeEventListener')

  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const el = document.createElement('div')
  el.addEventListener('click', handler)

  const event = new Event('click', { bubbles: true, cancelable: false })
  el.dispatchEvent(event)

  el.removeEventListener('click', handler)
  el.dispatchEvent(event)

  expect(handler).toHaveBeenCalledTimes(1)
  expect(EventTarget.prototype.addEventListener).toHaveBeenCalledTimes(1)
  expect(EventTarget.prototype.removeEventListener).toHaveBeenCalledTimes(1)
})

test('should send event when adding event listener', async () => {
  const eeHandler = jest.fn()
  const eventsEmitter = (await import('../../../src/common/wrap/wrap-events')).wrapEvents()
  eventsEmitter.on('addEventListener-start', eeHandler)

  const el = document.createElement('div')
  const handler = jest.fn()
  el.addEventListener('click', handler)

  expect(eeHandler).toHaveBeenCalledTimes(1)
  expect(eeHandler).toHaveBeenCalledWith(
    [
      'click',
      expect.any(Function)
    ],
    el,
    'addEventListener'
  )

  const originalHandler = Object.entries(eeHandler.mock.calls[0][0][1])
    .find(([key]) => key.startsWith('nr@original:'))[1]
  expect(originalHandler).toEqual(handler)
})

test('should send event when removing event listener', async () => {
  const eeHandler = jest.fn()
  const eventsEmitter = (await import('../../../src/common/wrap/wrap-events')).wrapEvents()
  eventsEmitter.on('removeEventListener-start', eeHandler)

  const el = document.createElement('div')
  const handler = jest.fn()
  el.addEventListener('click', handler)
  el.removeEventListener('click', handler)

  expect(eeHandler).toHaveBeenCalledTimes(1)

  const originalHandler = Object.entries(eeHandler.mock.calls[0][0][1])
    .find(([key]) => key.startsWith('nr@original:'))[1]
  expect(originalHandler).toEqual(handler)
})

test('should support listener object with handleEvent method', async () => {
  const eeHandler = jest.fn()
  const eventsEmitter = (await import('../../../src/common/wrap/wrap-events')).wrapEvents()
  eventsEmitter.on('addEventListener-start', eeHandler)

  const el = document.createElement('div')
  const handler = {
    handleEvent: jest.fn()
  }
  el.addEventListener('click', handler)

  expect(eeHandler).toHaveBeenCalledTimes(1)
  expect(eeHandler).toHaveBeenCalledWith(
    [
      'click',
      expect.any(Function)
    ],
    el,
    'addEventListener'
  )

  const event = new Event('click', { bubbles: true, cancelable: false })
  el.dispatchEvent(event)

  expect(handler.handleEvent).toHaveBeenCalledTimes(1)
})

test('calling addEventListener on window should call through to addEventListener on EventTarget', async () => {
  let target = window
  while (!Object.prototype.hasOwnProperty.call(target, 'addEventListener')) {
    target = Object.getPrototypeOf(target)
  }
  ;(await import('../../../src/common/wrap/wrap-events')).wrapEvents()

  const addE = target.addEventListener
  target.addEventListener = function (evName, handler, capture) {
    expect(evName).toEqual('click')
    expect(handler).toBe(clickHandler)
    expect(capture).toEqual(true)
  }
  window.addEventListener('click', clickHandler, true)

  target.addEventListener = addE // restore
  function clickHandler () {}
})

describe(' ', () => {
  let evtEE, listenerCount
  beforeAll(async () => {
    const { wrapEvents } = await import('../../../src/common/wrap/wrap-events')
    evtEE = wrapEvents()
    evtEE.on('fn-start', () => listenerCount++)
  })
  beforeEach(() => {
    listenerCount = 0
  })

  describe('addEventListener', () => {
    test('should target only the given event', () => {
      const e = createAndAddDomElement()
      let handlerCallCount = 0

      e.addEventListener('click', () => handlerCallCount++, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'mouseup')

      expect(handlerCallCount).toEqual(1)
      expect(listenerCount).toEqual(1)
    })

    test('should not blow up with a null func', () => {
      const e = createAndAddDomElement()

      try {
        e.addEventListener('click', null, false)
      } catch (e) {
        throw new Error('Caught exception')
      }
    })

    test('allows multiple subscribers to same event on same element', () => {
      let handler1CallCount = 0
      let handler2CallCount = 0
      const e = createAndAddDomElement()

      e.addEventListener('click', () => handler1CallCount++, false)
      e.addEventListener('click', () => handler2CallCount++, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'click')

      expect(handler1CallCount).toEqual(2)
      expect(handler2CallCount).toEqual(2)
    })

    test('allows object with handleEvent property', () => {
      const e = createAndAddDomElement()
      const clicker = new Clicker(e)
      e.addEventListener('click', clicker, false)

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(1)
      expect(listenerCount).toEqual(1)

      e.removeEventListener('click', clicker, false)
      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(1) // removing handler should work
      expect(listenerCount).toEqual(1) // should not have been called again
    })

    test('allows for multiple event listeners with an object', () => {
      const e = createAndAddDomElement()
      const clicker = new Clicker()
      e.addEventListener('click', clicker, false)
      e.addEventListener('keyup', clicker, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'keyup')
      expect(listenerCount).toEqual(2)
      expect(clicker.handlerCallCount).toEqual(2)

      e.removeEventListener('click', clicker, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'keyup')
      expect(listenerCount).toEqual(3)
      expect(clicker.handlerCallCount).toEqual(3)

      e.removeEventListener('keyup', clicker, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'keyup')
      expect(listenerCount).toEqual(3)
      expect(clicker.handlerCallCount).toEqual(3)
    })

    test('allows object with handleEvent property that is mutated', () => {
      const e = createAndAddDomElement()
      const clicker = new Clicker(e)
      e.addEventListener('click', clicker, false)

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(1)
      expect(listenerCount).toEqual(1)

      clicker.handleEvent = function (event) {
        this.handlerCallCount += 2
      }

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(3)
      expect(listenerCount).toEqual(2)
    })

    test('allows object with handleEvent property that is originally null', () => {
      const e = createAndAddDomElement()
      const clicker = new ClickerNoHandle(e)
      e.addEventListener('click', clicker, false)

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(0)

      clicker.handleEvent = function (event) {
        this.handlerCallCount += 2
      }

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(2)
    })
  })
  describe('removeEventListener', () => {
    test('works with handleEvent property', () => {
      const e = createAndAddDomElement()
      const clicker = new ClickerNoHandle(e)
      e.addEventListener('click', clicker, false)

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(0)

      clicker.handleEvent = function (event) {
        this.handlerCallCount += 2
      }

      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(2)
      e.removeEventListener('click', clicker, false)
      triggerEvent(e, 'click')
      expect(clicker.handlerCallCount).toEqual(2)
    })

    test('works when same callback is passed for different events', () => {
      let handlerCallCount = 0
      const handler = () => handlerCallCount++
      const e = createAndAddDomElement()

      e.addEventListener('click', handler, false)
      e.addEventListener('mouseup', handler, false)

      triggerEvent(e, 'click')
      triggerEvent(e, 'mouseup')
      expect(handlerCallCount).toEqual(2) // should have seen handler calls for both events

      e.removeEventListener('click', handler, false)
      triggerEvent(e, 'click')
      triggerEvent(e, 'mouseup')
      expect(handlerCallCount).toEqual(3) // should have seen handler call for mouseup only

      e.removeEventListener('mouseup', handler, false)
      triggerEvent(e, 'click')
      triggerEvent(e, 'mouseup')
      expect(handlerCallCount).toEqual(3) // should have seen handler calls for neither event
    })

    test('works when same callback is passed for different elements', () => {
      let handlerCallCount = 0
      const handler = () => handlerCallCount++
      const e1 = createAndAddDomElement()
      const e2 = createAndAddDomElement()
      const sameEvt = 'click'

      e1.addEventListener(sameEvt, handler, false)
      e2.addEventListener(sameEvt, handler, false)

      triggerEvent(e1, sameEvt)
      triggerEvent(e2, sameEvt)
      expect(handlerCallCount).toEqual(2) // should have seen handler calls for both elements

      e1.removeEventListener(sameEvt, handler, false)
      triggerEvent(e1, sameEvt)
      triggerEvent(e2, sameEvt)
      expect(handlerCallCount).toEqual(3) // should have seen handler call for e2 only

      e2.removeEventListener(sameEvt, handler, false)
      triggerEvent(e1, sameEvt)
      triggerEvent(e2, sameEvt)
      expect(handlerCallCount).toEqual(3) // should have seen handler calls for neither element
    })
  })
})

describe('wrap-events', () => {
  let interactiveElemsAddSpy
  let interactiveElemsDeleteSpy

  beforeEach(async () => {
    // import order is important
    const { interactiveElems } = await import('../../../src/features/generic_events/aggregate/user-actions/interactive-elements')
    interactiveElemsAddSpy = jest.spyOn(interactiveElems, 'add')
    interactiveElemsDeleteSpy = jest.spyOn(interactiveElems, 'delete')
    const { wrapEvents } = await import('../../../src/common/wrap/wrap-events')
    wrapEvents()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.resetModules()
  })

  describe('interactiveElems', () => {
    test('should track when click handling is added via addEventListener', async () => {
      const elem = createAndAddDomElement('button')
      elem.addEventListener('click', () => { })
      expect(interactiveElemsAddSpy).toHaveBeenCalledWith(elem, expect.any(Function))
    })

    test('should track when click handling is deleted via removeEventListener', async () => {
      const elem = createAndAddDomElement('button')
      const handler = () => { }
      elem.addEventListener('click', handler)
      elem.removeEventListener('click', handler)
      expect(interactiveElemsDeleteSpy).toHaveBeenCalledWith(elem, expect.any(Function))
    })

    test('should not track when non-click handling is added', async () => {
      const elem = createAndAddDomElement('button')
      const handler = () => { }
      elem.addEventListener('mouseover', handler)
      expect(interactiveElemsAddSpy).not.toHaveBeenCalledWith(elem, handler)
    })

    test('should not track when non-click handling is deleted', async () => {
      const elem = createAndAddDomElement('button')
      const handler = () => { }
      elem.addEventListener('mouseover', handler)
      elem.removeEventListener('mouseover', handler)
      expect(interactiveElemsDeleteSpy).not.toHaveBeenCalledWith(elem, handler)
    })
  })
})

class ClickerNoHandle {
  constructor (el) {
    this.handlerCallCount = 0
  }
}
class Clicker extends ClickerNoHandle {
  handleEvent (event) {
    this.handlerCallCount++
  }
}
function triggerEvent (el, eventName) {
  const evt = new Event(eventName, { bubbles: true })
  el.dispatchEvent(evt)
}
function createAndAddDomElement (tagName = 'div') {
  var el = document.createElement(tagName)
  document.body.appendChild(el)
  return el
}
