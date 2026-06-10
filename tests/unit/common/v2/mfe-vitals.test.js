/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

describe('trackMFEVitals', () => {
  let trackMFEVitals
  let mockDocument
  let mockMutationObserver
  let mockPerformanceObserver
  let mockEventListeners
  let mutationCallbacks
  let performanceCallbacks

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

    mockDocument = {
      readyState: 'complete'
    }

    // Mock globalScope
    jest.doMock('../../../../src/common/constants/runtime', () => ({
      globalScope: {
        MutationObserver: mockMutationObserver,
        PerformanceObserver: mockPerformanceObserver,
        document: mockDocument,
        getComputedStyle: jest.fn(() => ({ backgroundImage: 'none' })),
        addEventListener: jest.fn((type, handler, options) => {
          if (!mockEventListeners[type]) mockEventListeners[type] = []
          mockEventListeners[type].push({ handler, options })
        })
      },
      isBrowserScope: true
    }))

    // Mock now() to return incrementing values
    let timeCounter = 100
    jest.doMock('../../../../src/common/timing/now', () => ({
      now: jest.fn(() => timeCounter++)
    }))

    // Import after mocking
    const module = await import('../../../../src/common/v2/mfe-vitals')
    trackMFEVitals = module.trackMFEVitals
  })

  describe('FCP tracking', () => {
    it('should track FCP when contentful element is added to MFE', () => {
      const vitals = trackMFEVitals('test-mfe')
      expect(vitals.fcp).toBeNull()

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
      expect(vitals.fcp.value).toBeGreaterThan(0)
      expect(vitals.fcp.loadState).toBe('complete')
    })

    it('should capture loadState when FCP occurs', () => {
      mockDocument.readyState = 'loading'
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.fcp.loadState).toBe('loading')
    })
  })

  describe('LCP tracking', () => {
    it('should track LCP element metadata', () => {
      const vitals = trackMFEVitals('test-mfe')

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
        parentElement: mockContainer,
        parentNode: mockContainer,
        getBoundingClientRect: jest.fn(() => ({ width: 800, height: 600 }))
      }

      mutationCallbacks.forEach(cb => cb([{ addedNodes: [mockElement] }]))

      expect(vitals.lcp).toBeDefined()
      expect(vitals.lcp.value).toBeGreaterThan(0)
      expect(vitals.lcp.size).toBe(480000)
      expect(vitals.lcp.elTag).toBe('IMG')
      expect(vitals.lcp.eid).toBe('hero-image')
      expect(vitals.lcp.elUrl).toBe('https://example.com/image.jpg')
    })

    it('should update LCP when larger element is added', () => {
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.lcp.value).toBeGreaterThan(firstLcp)
      expect(vitals.lcp.size).toBe(480000)
      expect(vitals.lcp.eid).toBe('large')
    })

    it('should extract URL from element background image', () => {
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.lcp.elUrl).toBe('https://example.com/bg.png')
    })
  })

  describe('CLS tracking', () => {
    it('should track largest shift metadata', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      expect(vitals.cls.largestShiftValue).toBe(0.15)
      expect(vitals.cls.largestShiftTime).toBe(1000)
      expect(vitals.cls.largestShiftTarget).toBe('div#shifty')
      expect(vitals.cls.loadState).toBe('complete')
    })

    it('should update largest shift when bigger shift occurs', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      expect(vitals.cls.largestShiftValue).toBe(0.25)
      expect(vitals.cls.largestShiftTime).toBe(1500)
      expect(vitals.cls.largestShiftTarget).toBe('img#large-shift')
    })

    it('should ignore shifts with recent input', () => {
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.cls.value).toBe(0)
      expect(vitals.cls.largestShiftValue).toBeNull()
    })
  })

  describe('INP tracking', () => {
    it('should track interaction metadata', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      expect(vitals.inp.interactionTarget).toBe('button#submit')
      expect(vitals.inp.interactionTime).toBe(1000)
      expect(vitals.inp.interactionType).toBe('pointerdown')
      expect(vitals.inp.inputDelay).toBe(10)
      expect(vitals.inp.processingDuration).toBe(190)
      expect(vitals.inp.presentationDelay).toBe(50)
      expect(vitals.inp.nextPaintTime).toBe(1250)
      expect(vitals.inp.loadState).toBe('complete')
    })

    it('should update INP when longer interaction occurs', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      expect(vitals.inp.interactionTarget).toBe('button#field2')
      expect(vitals.inp.interactionType).toBe('click')
    })

    it('should handle missing processingStart/End gracefully', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      expect(vitals.inp.inputDelay).toBeNull()
      expect(vitals.inp.processingDuration).toBeNull()
      expect(vitals.inp.presentationDelay).toBeNull()
    })

    it('should ignore events without interactionId', () => {
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.inp).toBeNull()
    })
  })

  describe('Element scope validation', () => {
    it('should only track elements within the specified MFE', () => {
      const vitals = trackMFEVitals('mfe-a')

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

      expect(vitals.fcp).toBeNull()
    })

    it('should track nested elements within MFE', () => {
      const vitals = trackMFEVitals('nested-mfe')

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
      expect(vitals.fcp.value).toBeGreaterThan(0)
      expect(vitals.lcp).toBeDefined()
      expect(vitals.lcp.value).toBeGreaterThan(0)
    })
  })

  describe('disconnect functionality', () => {
    it('should disconnect all observers', () => {
      const vitals = trackMFEVitals('test-mfe')

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
      const vitals = trackMFEVitals('test-mfe')

      // Override disconnect to throw
      mockMutationObserver.mock.instances.forEach(instance => {
        instance.disconnect = jest.fn(() => { throw new Error('Already disconnected') })
      })

      expect(() => vitals.disconnect()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should return empty vitals when id is missing', () => {
      const vitals = trackMFEVitals('')

      expect(vitals.fcp).toBeNull()
      expect(vitals.lcp).toBeNull()
      expect(vitals.cls).toBeNull()
      expect(vitals.inp).toBeNull()
    })

    it('should handle elements without id or className', () => {
      const vitals = trackMFEVitals('test-mfe')

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

      expect(vitals.lcp.elTag).toBe('SPAN')
      expect(vitals.lcp.eid).toBe(null)
    })

    it('should handle elements with className as object', () => {
      const vitals = trackMFEVitals('test-mfe')

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
