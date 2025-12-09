/**
 * @jest-environment jsdom
 */

describe('load.js', () => {
  let checkState, onWindowLoad, onDOMContentLoaded, onPopstateChange
  let windowAddEventListener, documentAddEventListener

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    // Mock the event listener opts module
    jest.doMock('../../../../src/common/event-listener/event-listener-opts', () => ({
      windowAddEventListener: jest.fn((event, listener, capture) => {
        window.addEventListener(event, listener, { capture: !!capture, passive: false })
      }),
      documentAddEventListener: jest.fn((event, listener, capture) => {
        document.addEventListener(event, listener, { capture: !!capture, passive: false })
      })
    }))

    const eventListenerOpts = await import('../../../../src/common/event-listener/event-listener-opts')
    windowAddEventListener = eventListenerOpts.windowAddEventListener
    documentAddEventListener = eventListenerOpts.documentAddEventListener

    const loadModule = await import('../../../../src/common/window/load')
    checkState = loadModule.checkState
    onWindowLoad = loadModule.onWindowLoad
    onDOMContentLoaded = loadModule.onDOMContentLoaded
    onPopstateChange = loadModule.onPopstateChange
  })

  describe('checkState', () => {
    it('returns true when document.readyState is complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'complete'
      })
      expect(checkState()).toBe(true)
    })

    it('returns false when document.readyState is loading', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      expect(checkState()).toBe(false)
    })

    it('returns false when document.readyState is interactive', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'interactive'
      })
      expect(checkState()).toBe(false)
    })
  })

  describe('onWindowLoad', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('executes callback immediately if document is already complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'complete'
      })
      const cb = jest.fn()
      onWindowLoad(cb)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(windowAddEventListener).not.toHaveBeenCalled()
    })

    it('sets up load event listener if document is not complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onWindowLoad(cb, false)
      expect(windowAddEventListener).toHaveBeenCalledWith('load', expect.any(Function), false)
      expect(cb).not.toHaveBeenCalled()
    })

    it('executes callback when load event fires', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      const loadListener = windowAddEventListener.mock.calls[0][1]
      loadListener()

      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('sets up polling mechanism as backup', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      expect(cb).not.toHaveBeenCalled()

      // Advance timers but keep readyState as loading
      jest.advanceTimersByTime(100)
      expect(cb).not.toHaveBeenCalled()
    })

    it('executes callback via polling when readyState becomes complete', () => {
      let readyState = 'loading'
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => readyState
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      expect(cb).not.toHaveBeenCalled()

      // Change readyState to complete
      readyState = 'complete'

      // Advance timer to trigger poll
      jest.advanceTimersByTime(500)

      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('only executes callback once if both load event and polling trigger', () => {
      let readyState = 'loading'
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => readyState
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      const loadListener = windowAddEventListener.mock.calls[0][1]

      // Fire load event first
      loadListener()
      expect(cb).toHaveBeenCalledTimes(1)

      // Change readyState and advance timers
      readyState = 'complete'
      jest.advanceTimersByTime(100)

      // Should still only be called once due to single() wrapper
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('clears polling interval after callback executes via load event', () => {
      let readyState = 'loading'
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => readyState
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      const loadListener = windowAddEventListener.mock.calls[0][1]

      // Fire load event
      loadListener()
      expect(cb).toHaveBeenCalledTimes(1)

      // Change readyState to complete and advance many timer intervals
      readyState = 'complete'
      jest.advanceTimersByTime(1000)

      // Callback should still only be called once due to single() wrapper
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('clears polling interval after callback executes via polling', () => {
      let readyState = 'loading'
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => readyState
      })
      const cb = jest.fn()
      onWindowLoad(cb)

      expect(cb).not.toHaveBeenCalled()

      // Change readyState to complete
      readyState = 'complete'

      // Advance timer to trigger poll
      jest.advanceTimersByTime(500)
      expect(cb).toHaveBeenCalledTimes(1)

      // Advance many more intervals - poll should be cleared
      jest.advanceTimersByTime(1000)

      // Callback should still only be called once
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('uses capture parameter when setting up event listener', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onWindowLoad(cb, true)

      expect(windowAddEventListener).toHaveBeenCalledWith('load', expect.any(Function), true)
    })
  })

  describe('onDOMContentLoaded', () => {
    it('executes callback immediately if document is already complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'complete'
      })
      const cb = jest.fn()
      onDOMContentLoaded(cb)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(documentAddEventListener).not.toHaveBeenCalled()
    })

    it('sets up DOMContentLoaded event listener if document is not complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onDOMContentLoaded(cb)
      expect(documentAddEventListener).toHaveBeenCalledWith('DOMContentLoaded', cb)
      expect(cb).not.toHaveBeenCalled()
    })

    it('does not block BFCache by avoiding readystatechange event', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onDOMContentLoaded(cb)

      // Verify we're not using readystatechange
      expect(documentAddEventListener).toHaveBeenCalledWith('DOMContentLoaded', cb)
      expect(documentAddEventListener).not.toHaveBeenCalledWith('readystatechange', expect.any(Function))
    })
  })

  describe('onPopstateChange', () => {
    it('executes callback immediately if document is already complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'complete'
      })
      const cb = jest.fn()
      onPopstateChange(cb)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(windowAddEventListener).not.toHaveBeenCalled()
    })

    it('sets up popstate event listener if document is not complete', () => {
      Object.defineProperty(document, 'readyState', {
        configurable: true,
        get: () => 'loading'
      })
      const cb = jest.fn()
      onPopstateChange(cb)
      expect(windowAddEventListener).toHaveBeenCalledWith('popstate', cb)
      expect(cb).not.toHaveBeenCalled()
    })
  })
})
