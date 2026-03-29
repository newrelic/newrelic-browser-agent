/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

// Module under test
let scriptTrackerModule
let performanceObserverCallback
let mutationObserverCallback

// Mock control variables
let mockStack = null
let mockNavigationEntry = null
let currentTime = 0

// Helper to increment time for test scenarios
const resetTime = () => { currentTime = 0 }

// Store created script elements for cleanup
let createdScripts = []

const OriginalError = global.Error
class MockError extends OriginalError {
  constructor (...args) {
    super(...args)
    if (mockStack !== null) {
      this.stack = mockStack
    }
  }
}

beforeEach(async () => {
  jest.resetModules()
  jest.clearAllMocks()
  performanceObserverCallback = null
  mutationObserverCallback = null
  mockStack = null
  mockNavigationEntry = null
  resetTime()
  createdScripts = []

  global.Error = MockError
  MockError.stackTraceLimit = OriginalError.stackTraceLimit

  // Mock the now() function to return currentTime
  jest.doMock('../../../../src/common/timing/now', () => ({
    now: () => currentTime
  }))

  // Setup jsdom environment with mocks
  const performanceMock = {
    now: jest.fn(() => currentTime),
    getEntriesByType: jest.fn((type) => {
      if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
      if (type === 'resource') return []
      return []
    })
  }

  // Mock performance in all possible locations
  global.performance = performanceMock
  global.window.performance = performanceMock
  globalThis.performance = performanceMock

  global.window.PerformanceObserver = jest.fn((callback) => {
    performanceObserverCallback = callback
    return {
      observe: jest.fn(),
      disconnect: jest.fn()
    }
  })
  global.window.PerformanceObserver.supportedEntryTypes = ['resource']

  global.window.MutationObserver = jest.fn((callback) => {
    mutationObserverCallback = callback
    return {
      observe: jest.fn(),
      disconnect: jest.fn()
    }
  })

  // Override correlations map access
  global.window.correlations = new Map()

  // Import module after mocks are set up
  scriptTrackerModule = await import('../../../../src/common/v2/script-tracker')
})

afterEach(() => {
  global.Error = OriginalError
  createdScripts.forEach(script => script.remove())
  createdScripts = []
})

describe('script-tracker correlations', () => {
  describe('ScriptCorrelation structure', () => {
    test('creates correlation with nested dom and performance objects', async () => {
      const scriptUrl = 'https://cdn.example.com/mfe.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Simulate PerformanceObserver detecting script first
      currentTime = 100
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 50,
            responseEnd: 90
          }]
        })
      }

      // Then simulate MutationObserver detecting DOM element
      currentTime = 150
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      // Simulate load event
      currentTime = 200
      scriptElement.dispatchEvent(new Event('load'))

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      expect(correlations.length).toBe(1)

      const correlation = correlations[0]
      expect(correlation.url).toBe(scriptUrl)
      expect(correlation.dom.start).toBe(150)
      expect(correlation.dom.end).toBe(200)
      expect(correlation.dom.value).toBe(scriptElement)
      expect(correlation.performance.start).toBe(50)
      expect(correlation.performance.end).toBe(90)
      expect(correlation.performance.value).toMatchObject({
        name: scriptUrl,
        initiatorType: 'script'
      })

      // Verify script computed getters
      expect(correlation.script.start).toBe(Math.max(150, 90)) // 150
      expect(correlation.script.end).toBe(Math.max(200, 90)) // 200
    })

    test('correlation handles DOM-first scenario', async () => {
      const scriptUrl = 'https://cdn.example.com/dom-first.js'

      // Simulate MutationObserver detecting DOM element FIRST
      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      // Then PerformanceObserver fires later
      currentTime = 200
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 80,
            responseEnd: 180
          }]
        })
      }

      // Simulate load event
      currentTime = 250
      scriptElement.dispatchEvent(new Event('load'))

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      const correlation = correlations[0]

      // Should have both dom and performance data
      expect(correlation.dom).toBeDefined()
      expect(correlation.dom.start).toBe(100)
      expect(correlation.dom.end).toBe(250)
      expect(correlation.performance).toBeDefined()
      expect(correlation.performance.start).toBe(80)
      expect(correlation.performance.end).toBe(180)
    })

    test('correlation handles performance-only (no DOM) scenario', async () => {
      const scriptUrl = 'https://cdn.example.com/dynamic-import.js'

      // Only PerformanceObserver fires (e.g., dynamic import())
      currentTime = 100
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'fetch', // dynamic import shows as fetch
            startTime: 50,
            responseEnd: 95
          }]
        })
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      const correlation = correlations[0]

      // Both dom and performance objects always exist (initialized in constructor)
      expect(correlation.performance).toBeDefined()
      expect(correlation.performance.start).toBe(50)
      expect(correlation.performance.end).toBe(95)
      expect(correlation.performance.value).toBeDefined()
      expect(correlation.dom).toBeDefined()
      expect(correlation.dom.start).toBe(0) // default
      expect(correlation.dom.end).toBe(0) // default
      expect(correlation.dom.value).toBeUndefined() // default
    })

    test('correlation handles DOM-only (no performance yet) scenario', async () => {
      const scriptUrl = 'https://cdn.example.com/dom-only.js'

      // Only MutationObserver fires
      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      const correlation = correlations[0]

      // Both dom and performance objects always exist (initialized in constructor)
      expect(correlation.dom).toBeDefined()
      expect(correlation.dom.start).toBe(100)
      expect(correlation.dom.value).toBe(scriptElement)
      expect(correlation.performance).toBeDefined()
      expect(correlation.performance.start).toBe(0) // default
      expect(correlation.performance.end).toBe(0) // default
      expect(correlation.performance.value).toBeUndefined() // default
    })

    test('attaches load event listeners to capture dom.end', async () => {
      const scriptUrl = 'https://cdn.example.com/loadable.js'

      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      const correlation = correlations[0]

      // Initially has default value of 0
      expect(correlation.dom.end).toBe(0)

      // Fire load event
      currentTime = 200
      scriptElement.dispatchEvent(new Event('load'))

      // Should now have end time
      expect(correlation.dom.end).toBe(200)
    })

    test('captures error events and sets dom.end', async () => {
      const scriptUrl = 'https://cdn.example.com/failed.js'

      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      // Fire error event
      currentTime = 150
      scriptElement.dispatchEvent(new Event('error'))

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      const correlation = correlations[0]

      // Error event should still set dom.end
      expect(correlation.dom.end).toBe(150)
    })
  })

  describe('findScriptTimings with correlations', () => {
    beforeEach(async () => {
      scriptTrackerModule = await import('../../../../src/common/v2/script-tracker')
    })

    test('calculates script start as max(dom.start, performance.end)', () => {
      const scriptUrl = 'https://cdn.example.com/mfe.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Scenario 1: Performance ends AFTER DOM starts
      currentTime = 50
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 10,
            responseEnd: 150 // ends at 150
          }]
        })
      }

      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      currentTime = 200
      scriptElement.dispatchEvent(new Event('load'))

      currentTime = 220
      const timings = scriptTrackerModule.findScriptTimings()

      // scriptStart getter should return max(100, 150) = 150
      expect(timings.scriptStart).toBe(150)
      // scriptEnd getter should return max(200, 150) = 200
      expect(timings.scriptEnd).toBe(200)
      expect(timings.fetchStart).toBe(10)
      expect(timings.fetchEnd).toBe(150)

      // Verify correlation also has script getters
      const correlation = [...scriptTrackerModule.scriptCorrelations.values()][0]
      expect(correlation.script.start).toBe(150)
      expect(correlation.script.end).toBe(200)
    })

    test('calculates scriptStart as performance.end when dom.start comes first', () => {
      const scriptUrl = 'https://cdn.example.com/mfe2.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Scenario 2: DOM starts BEFORE performance ends
      currentTime = 200
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      currentTime = 250
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 100,
            responseEnd: 180 // ends at 180, before dom.start
          }]
        })
      }

      currentTime = 300
      scriptElement.dispatchEvent(new Event('load'))

      currentTime = 320
      const timings = scriptTrackerModule.findScriptTimings()

      // scriptStart should be max(200, 180) = 200
      expect(timings.scriptStart).toBe(200)
      // scriptEnd should be max(300, 180) = 300
      expect(timings.scriptEnd).toBe(300)

      // Verify correlation script getters
      const correlation = [...scriptTrackerModule.scriptCorrelations.values()].find(c => c.url.includes('mfe2.js'))
      expect(correlation.script.start).toBe(200)
      expect(correlation.script.end).toBe(300)
    })

    test('uses performance.end for scriptStart when dom.start is 0', () => {
      const scriptUrl = 'https://cdn.example.com/no-dom.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Only performance data available (e.g., dynamic import)
      currentTime = 100
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'fetch',
            startTime: 50,
            responseEnd: 90
          }]
        })
      }

      currentTime = 150
      const timings = scriptTrackerModule.findScriptTimings()

      // scriptStart getter should return max(0, 90) = 90
      expect(timings.scriptStart).toBe(90)
      // scriptEnd getter should return max(0, 90) = 90
      expect(timings.scriptEnd).toBe(90)
    })

    test('script timings should not be negative when load event has not fired', () => {
      const scriptUrl = 'https://cdn.example.com/not-loaded.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Performance and DOM present, but load event hasn't fired yet
      currentTime = 50
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 10,
            responseEnd: 40
          }]
        })
      }

      currentTime = 100
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      // Call register before load event fires (dom.end is still 0)
      currentTime = 120
      const timings = scriptTrackerModule.findScriptTimings()

      // scriptStart should be max(100, 40) = 100
      expect(timings.scriptStart).toBe(100)
      // scriptEnd getter should return max(0, 40, 100) = 100 (includes start to prevent negative duration)
      expect(timings.scriptEnd).toBe(100)
    })

    test('fallback to fetchEnd when no correlation exists', () => {
      const scriptUrl = 'https://cdn.example.com/uncorrelated.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      // Use thisFile from module so filtering works correctly
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Performance entry exists but no correlation was created
      currentTime = 100
      const perfEntry = {
        name: scriptUrl,
        initiatorType: 'script',
        startTime: 20,
        responseEnd: 80
      }
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') {
          return [perfEntry]
        }
        return []
      })

      currentTime = 150
      const timings = scriptTrackerModule.findScriptTimings()

      // Should use fetchEnd as fallback for scriptStart
      expect(timings.scriptStart).toBe(80) // fetchEnd fallback
      // scriptEnd uses registeredAt as fallback when no correlation exists
      expect(timings.scriptEnd).toBe(150) // registeredAt fallback
      expect(timings.fetchStart).toBe(20)
      expect(timings.fetchEnd).toBe(80)
    })
  })

  describe('Timing calculations for different loading methods', () => {
    test('dynamic script injection: full capture with all timings', () => {
      const scriptUrl = 'https://cdn.example.com/dynamic.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      const perfEntry = {
        name: scriptUrl,
        initiatorType: 'script',
        startTime: 0,
        responseEnd: 80
      }

      // Timeline: Fetch starts, fetch ends, DOM added, script loads, register called
      currentTime = 10
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [perfEntry]
        })
      }

      currentTime = 120
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      currentTime = 250
      scriptElement.dispatchEvent(new Event('load'))

      // Make performance entry available for findScriptTimings lookup
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') return [perfEntry]
        if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
        return []
      })

      currentTime = 260
      const timings = scriptTrackerModule.findScriptTimings()

      expect(timings.fetchStart).toBe(0)
      expect(timings.fetchEnd).toBe(80)
      // scriptStart = max(120, 80) = 120
      expect(timings.scriptStart).toBe(120)
      // scriptEnd = dom.end = 250
      expect(timings.scriptEnd).toBe(250)

      // Verify timeToRegister = scriptEnd - scriptStart = 250 - 120 = 130
      const timeToRegister = timings.scriptEnd - timings.scriptStart
      expect(timeToRegister).toBe(130)

      // Verify timeToLoad = timeToFetch + timeToRegister = 80 + 130 = 210
      const timeToFetch = timings.fetchEnd - timings.fetchStart
      const timeToLoad = timeToFetch + timeToRegister
      expect(timeToLoad).toBe(210)
    })

    test('preloaded script: performance entry before DOM insertion', () => {
      const scriptUrl = 'https://cdn.example.com/preload.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Preload completes early
      currentTime = 25
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: scriptUrl,
            initiatorType: 'link',
            startTime: 5,
            responseEnd: 20
          }]
        })
      }

      // Script element added much later (2 seconds like in your test)
      currentTime = 2080
      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      currentTime = 2161
      scriptElement.dispatchEvent(new Event('load'))

      // Make performance entry available for findScriptTimings lookup
      const perfEntry = {
        name: scriptUrl,
        initiatorType: 'link',
        startTime: 5,
        responseEnd: 20
      }
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') return [perfEntry]
        if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
        return []
      })

      currentTime = 2170
      const timings = scriptTrackerModule.findScriptTimings()

      expect(timings.fetchStart).toBe(5)
      expect(timings.fetchEnd).toBe(20)
      // scriptStart = max(2080, 20) = 2080 (DOM started way after fetch)
      expect(timings.scriptStart).toBe(2080)
      // scriptEnd = dom.end = 2161
      expect(timings.scriptEnd).toBe(2161)
    })

    test('dynamic import: performance-only with fetch initiatorType', () => {
      const scriptUrl = 'https://cdn.example.com/module.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      const perfEntry = {
        name: scriptUrl,
        initiatorType: 'fetch',
        startTime: 50,
        responseEnd: 95
      }

      // Dynamic import() shows as fetch, no DOM element
      currentTime = 100
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [perfEntry]
        })
      }

      // Make performance entry available for findScriptTimings lookup
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') return [perfEntry]
        if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
        return []
      })

      currentTime = 120
      const timings = scriptTrackerModule.findScriptTimings()

      expect(timings.fetchStart).toBe(50)
      expect(timings.fetchEnd).toBe(95)
      // scriptStart getter = max(0, 95) = 95 (dom.start is 0)
      expect(timings.scriptStart).toBe(95)
      // scriptEnd getter = max(0, 95) = 95 (dom.end is 0)
      expect(timings.scriptEnd).toBe(95)
      expect(timings.type).toBe('fetch')
    })

    test('inline script: returns early with inline type', () => {
      mockNavigationEntry = { name: 'https://example.com/page.html' }
      mockStack = `Error
    at findScriptTimings (https://example.com/page.html:10:15)
    at main (https://example.com/page.html:20:5)`

      currentTime = 100
      const timings = scriptTrackerModule.findScriptTimings()

      expect(timings.type).toBe('inline')
      expect(timings.asset).toBe('https://example.com/page.html')
      expect(timings.fetchStart).toBe(0)
      expect(timings.fetchEnd).toBe(0)
      expect(timings.scriptStart).toBe(0)
      expect(timings.scriptEnd).toBe(0)
    })

    test('static script: performance-only (no MutationObserver capture)', () => {
      const scriptUrl = 'https://cdn.example.com/static.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      // Only performance entry (MutationObserver missed it)
      currentTime = 100
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') {
          return [{
            name: scriptUrl,
            initiatorType: 'script',
            startTime: 20,
            responseEnd: 90
          }]
        }
        return []
      })

      currentTime = 150
      const timings = scriptTrackerModule.findScriptTimings()

      expect(timings.fetchStart).toBe(20)
      expect(timings.fetchEnd).toBe(90)
      // scriptStart uses fetchEnd as fallback when no correlation
      expect(timings.scriptStart).toBe(90)
      // scriptEnd uses registeredAt as fallback when no correlation
      expect(timings.scriptEnd).toBe(150)
    })
  })

  describe('Timing metric calculations', () => {
    test('timeToRegister = scriptEnd - scriptStart', () => {
      // Given correlation data:
      // performance: { start: 10, end: 80 }
      // dom: { start: 120, end: 250 }
      // registeredAt: 260

      const scriptStart = Math.max(120, 80) // = 120
      const scriptEnd = 250

      const timeToRegister = scriptEnd - scriptStart
      expect(timeToRegister).toBe(130)
    })

    test('timeToLoad = timeToFetch + timeToRegister', () => {
      // Given:
      const fetchStart = 10
      const fetchEnd = 80
      const scriptStart = 120
      const scriptEnd = 250

      const timeToFetch = fetchEnd - fetchStart // 70
      const timeToRegister = scriptEnd - scriptStart // 130
      const timeToLoad = timeToFetch + timeToRegister

      expect(timeToLoad).toBe(200) // 70 + 130
    })

    test('timing calculations for preloaded script scenario', () => {
      // Based on your sample data:
      // dom: { start: 2080, end: 2161 }
      // performance: { start: 25, end: 39 }

      const perfStart = 25
      const perfEnd = 39
      const domStart = 2080
      const domEnd = 2161

      const scriptStart = Math.max(domStart, perfEnd) // max(2080, 39) = 2080
      const scriptEnd = domEnd // 2161

      const timeToFetch = perfEnd - perfStart // 14
      const timeToRegister = scriptEnd - scriptStart // 81
      const timeToLoad = timeToFetch + timeToRegister // 95

      expect(timeToFetch).toBe(14)
      expect(timeToRegister).toBe(81)
      expect(timeToLoad).toBe(95)
    })

    test('timing calculations when DOM ends before register is called', () => {
      // Scenario: Script loads before register() is called
      // dom: { start: 100, end: 250 }
      // performance: { start: 50, end: 90 }

      const perfStart = 50
      const perfEnd = 90
      const domStart = 100
      const domEnd = 250

      const scriptStart = Math.max(domStart, perfEnd) // max(100, 90) = 100
      const scriptEnd = Math.max(domEnd, perfEnd) // max(250, 90) = 250

      const timeToFetch = perfEnd - perfStart // 40
      const timeToRegister = scriptEnd - scriptStart // 150
      const timeToLoad = timeToFetch + timeToRegister // 190

      expect(timeToFetch).toBe(40)
      expect(timeToRegister).toBe(150)
      expect(timeToLoad).toBe(190)
    })

    test('timing calculations for performance-only scenario (no DOM)', () => {
      // Scenario: dynamic import(), no DOM element
      // dom: { start: 0, end: 0 } (defaults)
      // performance: { start: 50, end: 95 }

      const perfStart = 50
      const perfEnd = 95
      const domStart = 0
      const domEnd = 0

      const scriptStart = Math.max(domStart, perfEnd) // max(0, 95) = 95
      const scriptEnd = Math.max(domEnd, perfEnd) // max(0, 95) = 95

      const timeToFetch = perfEnd - perfStart // 45
      const timeToRegister = scriptEnd - scriptStart // 0
      const timeToLoad = timeToFetch + timeToRegister // 45

      expect(timeToFetch).toBe(45)
      expect(timeToRegister).toBe(0)
      expect(timeToLoad).toBe(45)
    })
  })

  describe('Multiple scripts tracking', () => {
    test('tracks multiple scripts independently', () => {
      const script1Url = 'https://cdn.example.com/mfe1.js'
      const script2Url = 'https://cdn.example.com/mfe2.js'

      // Script 1: Performance first
      currentTime = 50
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: script1Url,
            initiatorType: 'script',
            startTime: 10,
            responseEnd: 40
          }]
        })
      }

      // Script 2: DOM first
      currentTime = 100
      const script2Element = document.createElement('script')
      script2Element.src = script2Url
      createdScripts.push(script2Element)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [script2Element]
        }])
      }

      // Script 1: DOM later
      currentTime = 120
      const script1Element = document.createElement('script')
      script1Element.src = script1Url
      createdScripts.push(script1Element)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [script1Element]
        }])
      }

      // Script 2: Performance later
      currentTime = 150
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: script2Url,
            initiatorType: 'script',
            startTime: 80,
            responseEnd: 140
          }]
        })
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      expect(correlations.length).toBe(2)

      // Both should have complete data
      correlations.forEach(corr => {
        expect(corr.dom).toBeDefined()
        expect(corr.performance).toBeDefined()
      })
    })

    test('maintains size limit of 1000 correlations', async () => {
      // Create 1050 script correlations
      for (let i = 0; i < 1050; i++) {
        const scriptUrl = `https://cdn.example.com/script${i}.js`
        currentTime = i * 10

        if (mutationObserverCallback) {
          const scriptElement = document.createElement('script')
          scriptElement.src = scriptUrl
          createdScripts.push(scriptElement)

          mutationObserverCallback([{
            addedNodes: [scriptElement]
          }])
        }
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      // Should only keep last 1000 (deletes first entry when size > 1000)
      expect(correlations.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Edge cases', () => {
    test('handles script element without src attribute', () => {
      currentTime = 100
      const inlineScript = document.createElement('script')
      inlineScript.textContent = 'console.log("inline")'
      createdScripts.push(inlineScript)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [inlineScript]
        }])
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      // Should not create correlation for inline scripts
      expect(correlations.length).toBe(0)
    })

    test('handles multiple mutations in single callback', () => {
      const script1 = document.createElement('script')
      script1.src = 'https://cdn.example.com/a.js'
      const script2 = document.createElement('script')
      script2.src = 'https://cdn.example.com/b.js'
      const divElement = document.createElement('div')

      createdScripts.push(script1, script2)

      currentTime = 100
      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [script1, divElement, script2] // Mixed node types
        }])
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      expect(correlations.length).toBe(2)
    })

    test('URL matching handles partial URLs correctly', () => {
      const fullUrl = 'https://cdn.example.com/path/to/mfe.js'
      const partialUrl = '/path/to/mfe.js'

      const perfEntry = {
        name: fullUrl,
        initiatorType: 'script',
        startTime: 10,
        responseEnd: 40
      }

      // Performance entry with full URL
      currentTime = 50
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [perfEntry]
        })
      }

      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${partialUrl}:10:5)`

      // Make performance entry available for findScriptTimings lookup
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') return [perfEntry]
        if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
        return []
      })

      currentTime = 100
      const timings = scriptTrackerModule.findScriptTimings()

      // Should match even with partial URL
      expect(timings.asset).toBe(fullUrl)
      expect(timings.fetchStart).toBe(10)
      expect(timings.fetchEnd).toBe(40)
    })

    test('handles very fast script loading', () => {
      const scriptUrl = 'https://cdn.example.com/fast.js'
      mockNavigationEntry = { name: 'https://example.com/' }
      mockStack = `Error
    at findScriptTimings (${scriptTrackerModule.thisFile}:1:1)
    at init (${scriptUrl}:10:5)`

      const perfEntry = {
        name: scriptUrl,
        initiatorType: 'script',
        startTime: 98,
        responseEnd: 99
      }

      // Everything happens in quick succession (cached script)
      currentTime = 100
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [perfEntry]
        })
      }

      const scriptElement = document.createElement('script')
      scriptElement.src = scriptUrl
      createdScripts.push(scriptElement)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [scriptElement]
        }])
      }

      currentTime = 101
      scriptElement.dispatchEvent(new Event('load'))

      // Make performance entry available for findScriptTimings lookup
      globalThis.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') return [perfEntry]
        if (type === 'navigation') return mockNavigationEntry ? [mockNavigationEntry] : []
        return []
      })

      currentTime = 102
      const timings = scriptTrackerModule.findScriptTimings()

      // scriptStart = max(100, 99) = 100
      expect(timings.scriptStart).toBe(100)
      // scriptEnd = dom.end = 101
      expect(timings.scriptEnd).toBe(101)

      const timeToRegister = timings.scriptEnd - timings.scriptStart
      expect(timeToRegister).toBe(1)
    })
  })

  describe('scriptCorrelations export', () => {
    test('returns array of all correlations for holistic viewing', () => {
      const urls = [
        'https://cdn.example.com/a.js',
        'https://cdn.example.com/b.js',
        'https://cdn.example.com/c.js'
      ]

      urls.forEach((url, index) => {
        currentTime = index * 100
        const scriptElement = document.createElement('script')
        scriptElement.src = url
        createdScripts.push(scriptElement)

        if (mutationObserverCallback) {
          mutationObserverCallback([{
            addedNodes: [scriptElement]
          }])
        }
      })

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]

      expect(correlations).toBeInstanceOf(Array)
      expect(correlations.length).toBe(3)
      correlations.forEach(corr => {
        expect(corr).toHaveProperty('url')
        expect(corr).toHaveProperty('dom')
      })
    })

    test('correlations show complete and incomplete loading states', () => {
      // Script 1: Full correlation (both DOM and performance)
      currentTime = 100
      const script1 = document.createElement('script')
      script1.src = 'https://cdn.example.com/complete.js'
      createdScripts.push(script1)

      if (mutationObserverCallback) {
        mutationObserverCallback([{
          addedNodes: [script1]
        }])
      }

      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: 'https://cdn.example.com/complete.js',
            initiatorType: 'script',
            startTime: 50,
            responseEnd: 95
          }]
        })
      }

      // Script 2: Only performance (dynamic import)
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: 'https://cdn.example.com/import-only.js',
            initiatorType: 'fetch',
            startTime: 60,
            responseEnd: 100
          }]
        })
      }

      const correlations = [...scriptTrackerModule.scriptCorrelations.values()]
      expect(correlations.length).toBe(2)

      const complete = correlations.find(c => c.url.includes('complete.js'))
      const importOnly = correlations.find(c => c.url.includes('import-only.js'))

      // Complete has both populated
      expect(complete.dom.start).toBeGreaterThan(0)
      expect(complete.dom.value).toBeDefined()
      expect(complete.performance.start).toBeGreaterThan(0)
      expect(complete.performance.value).toBeDefined()

      // Import-only has only performance populated (dom has default 0 values)
      expect(importOnly.dom.start).toBe(0)
      expect(importOnly.dom.value).toBeUndefined()
      expect(importOnly.performance.start).toBeGreaterThan(0)
      expect(importOnly.performance.value).toBeDefined()
    })
  })
})
