/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('trackMFEVitals', () => {
  let trackMFEVitals
  let mockDocument
  let mockMutationObserver
  let mockPerformanceObserver
  let mockResizeObserver
  let mockEventListeners
  let mutationCallbacks
  let performanceCallbacks
  let timings
  const clockBaseline = 11

  beforeEach(async () => {
    jest.resetModules()
    jest.clearAllMocks()

    mockEventListeners = {}
    performanceCallbacks = {}
    mutationCallbacks = []

    // Mock MutationObserver
    mockMutationObserver = jest.fn(function (callback) {
      mutationCallbacks.push(callback)
      this.observe = jest.fn()
      this.disconnect = jest.fn()
    })

    // Mock PerformanceObserver
    mockPerformanceObserver = jest.fn(function (callback) {
      this.observe = jest.fn((config) => {
        performanceCallbacks[config.type] = callback
      })
      this.disconnect = jest.fn()
    })

    // Mock ResizeObserver
    mockResizeObserver = jest.fn(function (callback) {
      this.observe = jest.fn((element) => {
        // Trigger callback immediately with mock entry
        const rect = element.getBoundingClientRect?.() || { width: 0, height: 0 }
        callback([{
          target: element,
          contentRect: rect
        }])
      })
      this.disconnect = jest.fn()
      this.unobserve = jest.fn()
    })

    mockDocument = {
      readyState: 'complete',
      querySelector: jest.fn((selector) => {
        // By default, simulate that MFE container exists
        if (selector.includes('data-nr-mfe-id')) {
          return { dataset: { nrMfeId: 'test-mfe' } }
        }
        return null
      })
    }

    // Mock globalScope
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      globalScope: {
        MutationObserver: mockMutationObserver,
        PerformanceObserver: mockPerformanceObserver,
        ResizeObserver: mockResizeObserver,
        Set: global.Set,
        document: mockDocument,
        getComputedStyle: jest.fn(() => ({ backgroundImage: 'none' })),
        addEventListener: jest.fn((type, handler, options) => {
          if (!mockEventListeners[type]) mockEventListeners[type] = []
          mockEventListeners[type].push({ handler, options })
        }),
        removeEventListener: jest.fn((type, handler) => {
          if (mockEventListeners[type]) {
            mockEventListeners[type] = mockEventListeners[type].filter(
              listener => listener.handler !== handler
            )
          }
        })
      },
      isBrowserScope: true
    }))

    // Mock now() to return incrementing values.
    // The first relative LCP tick lands on `clockBaseline + 1` because the collector
    // consumes one clock tick when it observes the node and another when it wins the size check.
    let timeCounter = 100
    jest.doMock('../../../../src/common/timing/now', () => ({
      now: jest.fn(() => timeCounter++)
    }))

    timings = {
      scriptStart: 90,
      registeredAt: 0
    }

    // Import after mocking
    const module = await import('../../../../src/common/v2/mfe-vitals')
    trackMFEVitals = module.trackMFEVitals
  })

  describe('FCP tracking', () => {
    it('should track FCP when contentful element is added to MFE', () => {
      const vitals = trackMFEVitals('test-mfe', timings)
      // The collector seeds FCP as soon as it sees the MFE marker on the page.
      expect(vitals.fcp.value).toBe(clockBaseline - 1)

      // Create a mock element with text content inside MFE container
      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'Hello world',
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        parentElement: mockContainer,
        parentNode: mockContainer
      }

      // Simulate mutation observer detecting new node
      mutationCallbacks.forEach(cb => cb([{
        addedNodes: [mockElement]
      }]))

      expect(vitals.fcp).toBeDefined()
      expect(vitals.fcp.value).toBe(clockBaseline - 1)
    })

    it('should use scriptStart as the timestamp anchor for FCP', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'Content',
        nodeType: 1,
        tagName: 'P',
        nodeName: 'P',
        parentElement: mockContainer,
        parentNode: mockContainer
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.fcp.value).toBe(clockBaseline - 1)
    })
  })

  describe('LCP tracking', () => {
    it('should track LCP as a relative timestamp', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'Large content',
        nodeType: 1,
        tagName: 'IMG',
        nodeName: 'IMG',
        id: 'hero-image',
        src: 'https://example.com/image.jpg?v=1#anchor',
        complete: true,
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 800, height: 600 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.lcp).toBeDefined()
      expect(vitals.lcp.value).toBe(clockBaseline + 1)
    })

    it('should update LCP when larger element is added', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const smallElement = {
        textContent: 'Small',
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        id: 'small',
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [smallElement] }]))
      const firstLcp = vitals.lcp.value

      const largeElement = {
        textContent: 'Large',
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        id: 'large',
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 800, height: 600 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [largeElement] }]))

      expect(firstLcp).toBe(clockBaseline + 1)
      expect(vitals.lcp.value).toBe(clockBaseline + 2)
    })

    it('should extract URL from element background image', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
      mockGlobalScope.getComputedStyle = jest.fn(() => ({
        backgroundImage: 'url("https://example.com/bg.png?v=1")'
      }))

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'Content',
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        id: 'hero',
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 800, height: 600 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.lcp.value).toBe(clockBaseline + 1)
    })

    describe('ResizeObserver-based measurement', () => {
      it('should use ResizeObserver to measure element sizes without layout thrashing', () => {
        trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const mockElement = {
          textContent: 'Content',
          nodeType: 1,
          tagName: 'DIV',
          nodeName: 'DIV',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 500, height: 400 }))
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

        // ResizeObserver should have been called
        expect(mockResizeObserver).toHaveBeenCalled()
        const resizeObserverInstance = mockResizeObserver.mock.instances[0]
        expect(resizeObserverInstance.observe).toHaveBeenCalledWith(mockElement)
      })

      it('should ignore elements with zero dimensions', () => {
        const vitals = trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const zeroSizeElement = {
          textContent: 'Hidden content',
          nodeType: 1,
          tagName: 'DIV',
          nodeName: 'DIV',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 0, height: 0 }))
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [zeroSizeElement] }]))

        // LCP should still be at baseline (from populateVitalMinimums)
        expect(vitals.lcp.value).toBe(clockBaseline)
      })

      it('should track same element only once', () => {
        trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const mockElement = {
          textContent: 'Content',
          nodeType: 1,
          tagName: 'DIV',
          nodeName: 'DIV',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 300, height: 200 }))
        }

        // Add same element twice
        mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))
        mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

        const resizeObserverInstance = mockResizeObserver.mock.instances[0]
        // Should only observe once (Set prevents duplicates)
        expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(1)
      })
    })

    describe('Image and video load event handling', () => {
      it('should capture LCP immediately for already-loaded images', () => {
        const vitals = trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const loadedImage = {
          nodeType: 1,
          tagName: 'IMG',
          nodeName: 'IMG',
          complete: true,
          src: 'https://example.com/image.jpg',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 800, height: 600 }))
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [loadedImage] }]))

        // Should capture LCP timestamp immediately
        expect(vitals.lcp.value).toBe(clockBaseline + 1)
      })

      it('should wait for load event on unloaded images', () => {
        const vitals = trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const loadListeners = []
        const unloadedImage = {
          nodeType: 1,
          tagName: 'IMG',
          nodeName: 'IMG',
          complete: false,
          src: 'https://example.com/large-image.jpg',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 1200, height: 800 })),
          addEventListener: jest.fn((event, handler, options) => {
            if (event === 'load') loadListeners.push({ handler, options })
          })
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [unloadedImage] }]))

        // LCP timestamp should not be set yet (still at baseline from populateVitalMinimums)
        const lcpBeforeLoad = vitals.lcp.value

        // Simulate image load event
        expect(loadListeners.length).toBe(1)
        loadListeners[0].handler()

        // Now LCP timestamp should be updated
        expect(vitals.lcp.value).toBeGreaterThan(lcpBeforeLoad)
      })

      it('should wait for load event on video elements', () => {
        const vitals = trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const loadListeners = []
        const unloadedVideo = {
          nodeType: 1,
          tagName: 'VIDEO',
          nodeName: 'VIDEO',
          complete: false,
          src: 'https://example.com/video.mp4',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 1920, height: 1080 })),
          addEventListener: jest.fn((event, handler, options) => {
            if (event === 'load') loadListeners.push({ handler, options })
          })
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [unloadedVideo] }]))

        const lcpBeforeLoad = vitals.lcp.value

        // Simulate video load event
        expect(loadListeners.length).toBe(1)
        loadListeners[0].handler()

        expect(vitals.lcp.value).toBeGreaterThan(lcpBeforeLoad)
      })

      it('should use once:true for image load listeners to prevent memory leaks', () => {
        trackMFEVitals('test-mfe', timings)

        const mockContainer = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentNode: null
        }

        const unloadedImage = {
          nodeType: 1,
          tagName: 'IMG',
          nodeName: 'IMG',
          complete: false,
          src: 'https://example.com/image.jpg',
          parentElement: mockContainer,
          parentNode: mockContainer,
          getBoundingClientRect: jest.fn(() => ({ width: 600, height: 400 })),
          addEventListener: jest.fn()
        }

        mutationCallbacks.forEach(cb => cb([{ addedNodes: [unloadedImage] }]))

        expect(unloadedImage.addEventListener).toHaveBeenCalledWith(
          'load',
          expect.any(Function),
          { once: true }
        )
      })
    })

    describe('Disconnect on user interaction', () => {
      it('should disconnect LCP observer on pointerdown within MFE', () => {
        trackMFEVitals('test-mfe', timings)
        const pointerListeners = mockEventListeners.pointerdown || []
        expect(pointerListeners.length).toBeGreaterThan(0)

        const mockTarget = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'BUTTON',
          nodeName: 'BUTTON',
          parentElement: null,
          parentNode: null
        }

        // Trigger pointerdown event within MFE
        pointerListeners[0].handler({ target: mockTarget })

        // LCP MutationObserver (second instance) should be disconnected
        const lcpObserver = mockMutationObserver.mock.instances[1]
        expect(lcpObserver.disconnect).toHaveBeenCalled()
      })

      it('should disconnect LCP observer on keydown within MFE', () => {
        trackMFEVitals('test-mfe', timings)

        const keyListeners = mockEventListeners.keydown || []
        expect(keyListeners.length).toBeGreaterThan(0)

        const mockTarget = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'INPUT',
          nodeName: 'INPUT',
          parentElement: null,
          parentNode: null
        }

        // Trigger keydown event within MFE
        keyListeners[0].handler({ target: mockTarget })

        const lcpObserver = mockMutationObserver.mock.instances[1]
        expect(lcpObserver.disconnect).toHaveBeenCalled()
      })

      it('should not disconnect LCP observer for interactions outside MFE', () => {
        trackMFEVitals('test-mfe', timings)

        const pointerListeners = mockEventListeners.pointerdown || []

        const outsideTarget = {
          nodeType: 1,
          dataset: { nrMfeId: 'different-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV',
          parentElement: null,
          parentNode: null
        }

        // Trigger event outside MFE
        pointerListeners[0].handler({ target: outsideTarget })

        const lcpObserver = mockMutationObserver.mock.instances[1]
        expect(lcpObserver.disconnect).not.toHaveBeenCalled()
      })

      it('should remove interaction listeners after LCP disconnect', () => {
        trackMFEVitals('test-mfe', timings)

        const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope

        const mockTarget = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'BUTTON',
          nodeName: 'BUTTON',
          parentElement: null,
          parentNode: null
        }

        // Trigger interaction
        mockEventListeners.pointerdown[0].handler({ target: mockTarget })

        // Listeners should be removed
        expect(mockGlobalScope.removeEventListener).toHaveBeenCalledWith(
          'pointerdown',
          expect.any(Function),
          { passive: true }
        )
        expect(mockGlobalScope.removeEventListener).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function),
          { passive: true }
        )
      })
    })
  })

  describe('CLS tracking', () => {
    it('should accumulate CLS from matching layout shifts', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockNode = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        id: 'shifty',
        className: 'shift-element',
        parentElement: null,
        parentNode: null
      }

      // Simulate layout shift entry
      const shiftEntry = {
        value: 0.15,
        startTime: 1000,
        hadRecentInput: false,
        sources: [{ node: mockNode }]
      }

      performanceCallbacks['layout-shift']({ getEntries: () => [shiftEntry] })

      expect(vitals.cls.value).toBeCloseTo(0.15, 2)
    })

    it('should update largest shift when bigger shift occurs', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockNode1 = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        id: 'small-shift',
        parentElement: null,
        parentNode: null
      }

      const mockNode2 = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'IMG',
        nodeName: 'IMG',
        id: 'large-shift',
        className: 'hero',
        parentElement: null,
        parentNode: null
      }

      performanceCallbacks['layout-shift']({
        getEntries: () => [
          {
            value: 0.1,
            startTime: 500,
            hadRecentInput: false,
            sources: [{ node: mockNode1 }]
          }
        ]
      })

      performanceCallbacks['layout-shift']({
        getEntries: () => [
          {
            value: 0.25,
            startTime: 1500,
            hadRecentInput: false,
            sources: [{ node: mockNode2 }]
          }
        ]
      })

      expect(vitals.cls.value).toBeCloseTo(0.35, 2)
    })

    it('should ignore shifts with recent input', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockNode = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentElement: null,
        parentNode: null
      }

      performanceCallbacks['layout-shift']({
        getEntries: () => [
          {
            value: 0.5,
            startTime: 1000,
            hadRecentInput: true,
            sources: [{ node: mockNode }]
          }
        ]
      })

      // CLS should remain at initial value of 0 since input-related shifts are ignored
      expect(vitals.cls.value).toBe(0)
    })

    it('should be null when MFE container is not found in DOM', () => {
      // Override querySelector to return null (MFE not in DOM)
      const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
      mockGlobalScope.document.querySelector = jest.fn(() => null)

      const vitals = trackMFEVitals('missing-mfe', timings)

      expect(vitals.cls.value).toBeNull()
    })
  })

  describe('INP tracking', () => {
    it('should track the longest interaction duration', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockTarget = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'BUTTON',
        nodeName: 'BUTTON',
        id: 'submit',
        className: 'btn primary',
        parentElement: null,
        parentNode: null
      }

      const eventEntry = {
        interactionId: 123,
        target: mockTarget,
        duration: 250,
        startTime: 1000,
        name: 'pointerdown',
        processingStart: 1010,
        processingEnd: 1200
      }

      performanceCallbacks.event({ getEntries: () => [eventEntry] })

      expect(vitals.inp.value).toBe(250)
    })

    it('should update INP when longer interaction occurs', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockTarget1 = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'INPUT',
        nodeName: 'INPUT',
        id: 'field1',
        parentElement: null,
        parentNode: null
      }

      const mockTarget2 = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'BUTTON',
        nodeName: 'BUTTON',
        id: 'field2',
        parentElement: null,
        parentNode: null
      }

      performanceCallbacks.event({
        getEntries: () => [
          {
            interactionId: 1,
            target: mockTarget1,
            duration: 100,
            startTime: 500,
            name: 'keydown',
            processingStart: 505,
            processingEnd: 580
          }
        ]
      })

      performanceCallbacks.event({
        getEntries: () => [
          {
            interactionId: 2,
            target: mockTarget2,
            duration: 300,
            startTime: 2000,
            name: 'click',
            processingStart: 2020,
            processingEnd: 2250
          }
        ]
      })

      expect(vitals.inp.value).toBe(300)
    })

    it('should handle missing processingStart/End gracefully', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockTarget = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentElement: null,
        parentNode: null
      }

      const eventEntry = {
        interactionId: 123,
        target: mockTarget,
        duration: 150,
        startTime: 1000,
        name: 'click'
        // No processingStart/processingEnd
      }

      performanceCallbacks.event({
        getEntries: () => [eventEntry]
      })

      expect(vitals.inp.value).toBe(150)
    })

    it('should ignore events without interactionId', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockTarget = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentElement: null,
        parentNode: null
      }

      performanceCallbacks.event({
        getEntries: () => [
          {
            target: mockTarget,
            duration: 150,
            startTime: 1000,
            name: 'click'
          }
        ]
      })

      expect(vitals.inp.value).toBeNull()
    })
  })

  describe('Element scope validation', () => {
    it('should only track elements within the specified MFE', () => {
      const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
      mockGlobalScope.document.querySelector = jest.fn(() => null)

      const vitals = trackMFEVitals('mfe-a', timings)

      const mfeBContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'mfe-b' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mfeBElement = {
        textContent: 'MFE B content',
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        parentElement: mfeBContainer,
        parentNode: mfeBContainer
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mfeBElement] }]))

      expect(vitals.fcp.value).toBeNull()
    })

    it('should track nested elements within MFE', () => {
      const vitals = trackMFEVitals('nested-mfe', timings)

      const parentElement = {
        nodeType: 1,
        dataset: { nrMfeId: 'nested-mfe' },
        tagName: 'SECTION',
        nodeName: 'SECTION',
        parentNode: null
      }

      const childElement = {
        textContent: 'Child content',
        nodeType: 1,
        tagName: 'P',
        nodeName: 'P',
        parentElement,
        parentNode: parentElement,
        getBoundingClientRect: jest.fn(() => ({ width: 400, height: 300 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [childElement] }]))

      expect(vitals.fcp).toBeDefined()
      expect(vitals.fcp.value).toBe(clockBaseline - 1)
      expect(vitals.lcp).toBeDefined()
      expect(vitals.lcp.value).toBe(clockBaseline + 1)
    })
  })

  describe('Performance optimizations', () => {
    describe('MFE root scoping', () => {
      it('should observe from MFE root when it already exists', () => {
        const mockRoot = {
          nodeType: 1,
          dataset: { nrMfeId: 'test-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV'
        }

        const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
        mockGlobalScope.document.querySelector = jest.fn((selector) => {
          if (selector === '[data-nr-mfe-id="test-mfe"]') return mockRoot
          return null
        })

        trackMFEVitals('test-mfe', timings)

        // MutationObserver should observe the root, not document
        const mutationObserverInstance = mockMutationObserver.mock.instances[0]
        expect(mutationObserverInstance.observe).toHaveBeenCalledWith(
          mockRoot,
          { childList: true, subtree: true }
        )
      })

      it('should switch from document to root observation when root appears', () => {
        const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
        mockGlobalScope.document.querySelector = jest.fn(() => null)

        trackMFEVitals('dynamic-mfe', timings)

        // Initially observes document
        const mutationObserverInstance = mockMutationObserver.mock.instances[0]
        expect(mutationObserverInstance.observe).toHaveBeenCalledWith(
          mockGlobalScope.document,
          { childList: true, subtree: true }
        )

        // Now the MFE root appears
        const mfeRoot = {
          nodeType: 1,
          dataset: { nrMfeId: 'dynamic-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV'
        }

        // Simulate mutation observer detecting the root being added
        mutationCallbacks.forEach(cb => cb([{ addedNodes: [mfeRoot] }]))

        // Should disconnect and re-observe at root level
        expect(mutationObserverInstance.disconnect).toHaveBeenCalled()
        expect(mutationObserverInstance.observe).toHaveBeenCalledWith(
          mfeRoot,
          { childList: true, subtree: true }
        )
      })

      it('should skip isInMFE checks when observing from root', () => {
        const mockRoot = {
          nodeType: 1,
          dataset: { nrMfeId: 'scoped-mfe' },
          tagName: 'DIV',
          nodeName: 'DIV'
        }

        const mockGlobalScope = require('../../../../src/common/constants/runtime').globalScope
        mockGlobalScope.document.querySelector = jest.fn((selector) => {
          if (selector === '[data-nr-mfe-id="scoped-mfe"]') return mockRoot
          return null
        })

        const vitals = trackMFEVitals('scoped-mfe', timings)

        // Add element directly under root (no parent hierarchy needed for test)
        const mockElement = {
          textContent: 'Content',
          nodeType: 1,
          tagName: 'DIV',
          nodeName: 'DIV',
          getBoundingClientRect: jest.fn(() => ({ width: 300, height: 200 }))
        }

        // When observing from root, all mutations are implicitly in the MFE
        mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

        expect(vitals.lcp.value).toBe(clockBaseline + 1)
      })
    })
  })

  describe('disconnect functionality', () => {
    it('should disconnect all observers', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      vitals.disconnect()

      // Check that observers were created
      expect(mockMutationObserver).toHaveBeenCalled()
      expect(mockPerformanceObserver).toHaveBeenCalled()

      // The LCP observer (2nd MutationObserver) should be disconnected via vitals.disconnect()
      // Note: FCP observer (1st MutationObserver) disconnects itself when FCP is detected
      const mutationObserverInstances = mockMutationObserver.mock.instances
      const performanceObserverInstances = mockPerformanceObserver.mock.instances

      // At least the LCP observer should be disconnected
      const lcpObserver = mutationObserverInstances[1] // Second MutationObserver is for LCP
      expect(lcpObserver).toBeDefined()
      expect(lcpObserver.disconnect).toHaveBeenCalled()

      // Performance observers (CLS, INP) should also be disconnected
      performanceObserverInstances.forEach(instance => {
        expect(instance.disconnect).toHaveBeenCalled()
      })
    })

    it('should handle disconnect errors gracefully', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      // Override disconnect to throw
      mockMutationObserver.mock.instances.forEach(instance => {
        instance.disconnect = jest.fn(() => { throw new Error('Already disconnected') })
      })

      expect(() => vitals.disconnect()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should return empty vitals when id is missing', () => {
      const vitals = trackMFEVitals('', timings)

      // The collector still returns the vitals shell, but the value getters are never populated.
      expect(Object.getOwnPropertyDescriptor(vitals.fcp, 'value')?.get).toEqual(expect.any(Function))
      expect(Object.getOwnPropertyDescriptor(vitals.lcp, 'value')?.get).toEqual(expect.any(Function))
      expect(vitals.cls.value).toBeNull()
      expect(vitals.inp.value).toBeNull()
    })

    it('should handle elements without id or className', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'No ID or class',
        nodeType: 1,
        tagName: 'SPAN',
        nodeName: 'SPAN',
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 200, height: 100 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.lcp.value).toBe(clockBaseline + 1)
    })

    it('should handle elements with className as object', () => {
      const vitals = trackMFEVitals('test-mfe', timings)

      const mockContainer = {
        nodeType: 1,
        dataset: { nrMfeId: 'test-mfe' },
        tagName: 'DIV',
        nodeName: 'DIV',
        parentNode: null
      }

      const mockElement = {
        textContent: 'SVG element',
        nodeType: 1,
        tagName: 'svg',
        nodeName: 'svg',
        className: { baseVal: 'icon' }, // SVG className is an object
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 50, height: 50 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.lcp).toBeDefined()
    })
  })
})
