/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment node
 */

// Store the PerformanceObserver callback for test manipulation
let performanceObserverCallback
// Module under test, dynamically imported to allow mock setup
let scriptTrackerModule
// Allows tests to control Error.stack content
let mockStack = null

// Helper to construct error with custom stack
const OriginalError = global.Error
class MockError extends OriginalError {
  constructor (...args) {
    super(...args)
    // Override stack if test has set a custom value
    if (mockStack !== null) {
      this.stack = mockStack
    }
  }
}

beforeEach(() => {
  // Reset module state to ensure clean test isolation
  jest.resetModules()
  jest.clearAllMocks()
  performanceObserverCallback = null
  mockStack = null

  // Setup custom Error class to control stack traces
  global.Error = MockError
  MockError.stackTraceLimit = OriginalError.stackTraceLimit

  // Mock browser globals needed by script-tracker
  global.window = {
    performance: {
      now: jest.fn(() => Date.now()),
      getEntriesByType: jest.fn(() => []) // Returns performance entries
    },
    document: {
      querySelectorAll: jest.fn(() => []) // Returns DOM elements
    },
    PerformanceObserver: jest.fn((callback) => {
      // Capture callback so tests can trigger it manually
      performanceObserverCallback = callback
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      }
    }),
    Error: MockError
  }

  global.window.PerformanceObserver.supportedEntryTypes = ['resource']
  // Expose as global properties for Node environment
  global.performance = global.window.performance
  global.document = global.window.document
  global.PerformanceObserver = global.window.PerformanceObserver
})

afterEach(() => {
  // Restore original globals after each test
  global.Error = OriginalError
  delete global.window
  delete global.performance
  delete global.document
  delete global.PerformanceObserver
})

describe('script-tracker', () => {
  describe('findScriptTimings', () => {
    beforeEach(async () => {
      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')
    })

    test('returns default timings when no stack available', () => {
      // Setup: Error with no stack trace
      mockStack = undefined

      const result = scriptTrackerModule.findScriptTimings()

      // Verify default values returned when stack parsing fails
      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
      expect(result.registeredAt).toBeGreaterThan(0)
    })

    test('identifies inline script when URL matches navigation', () => {
      // Setup: Mock navigation entry with page URL
      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/page.html' }]
        }
        return []
      })

      // Stack trace contains same URL as navigation entry (inline script)
      mockStack = `Error
    at findScriptTimings (https://example.com/page.html:10:15)
    at callFunction (https://example.com/page.html:20:5)`

      const result = scriptTrackerModule.findScriptTimings()

      // Verify script detected as inline (same origin as page)
      expect(result.type).toBe('inline')
      expect(result.asset).toBe('https://example.com/page.html')
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('finds script timing from performance.getEntriesByType', () => {
      // Setup: Mock resource entry for external script
      const mockResourceEntry = {
        name: 'https://cdn.example.com/mfe-app.js',
        initiatorType: 'script',
        startTime: 100.5,
        responseEnd: 250.8
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Stack trace references the external script
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at Object.register (internal:5:10)
    at main (https://cdn.example.com/mfe-app.js:15:20)`

      const result = scriptTrackerModule.findScriptTimings()

      // Verify timing info extracted from resource entry (floored to integers)
      expect(result.fetchStart).toBe(100)
      expect(result.fetchEnd).toBe(250)
      expect(result.asset).toBe('https://cdn.example.com/mfe-app.js')
      expect(result.type).toBe('script')
    })

    test('finds script timing from PerformanceObserver scripts set', async () => {
      // Reimport to trigger PerformanceObserver setup on module load
      jest.resetModules()
      const mockResourceEntry = {
        name: 'https://cdn.example.com/tracked-app.js',
        initiatorType: 'script',
        startTime: 150.2,
        responseEnd: 300.7
      }

      // Setup: Script not in static buffer, only in observer
      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [] // Not in static buffer
        }
        return []
      })

      // Stack references script tracked by observer
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:10:5)
    at init (https://cdn.example.com/tracked-app.js:25:10)`

      // Import module to activate PerformanceObserver
      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Simulate PerformanceObserver detecting the script load
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [mockResourceEntry]
        })
      }

      const result = scriptTrackerModule.findScriptTimings()

      // Verify timing found from observer's internal Set
      expect(result.fetchStart).toBe(150)
      expect(result.fetchEnd).toBe(300)
      expect(result.asset).toBe('https://cdn.example.com/tracked-app.js')
      expect(result.type).toBe('script')
    })

    test('handles link resources with .js extension', async () => {
      jest.resetModules()

      // Setup: Link element preloading a .js file
      const mockLinkEntry = {
        name: 'https://cdn.example.com/preload.js',
        initiatorType: 'link',
        startTime: 50.1,
        responseEnd: 120.5
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        return []
      })

      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at setup (https://cdn.example.com/preload.js:10:5)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Trigger observer with link entry (.js files from link tags are tracked)
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [mockLinkEntry]
        })
      }

      const result = scriptTrackerModule.findScriptTimings()

      // Verify detected as link type (preloaded script)
      expect(result.type).toBe('link')
      expect(result.asset).toBe('https://cdn.example.com/preload.js')
    })

    test('identifies preloaded scripts and sets type to preload', async () => {
      jest.resetModules()

      // Setup: DOM link element with preload rel attribute
      const mockLink = {
        href: 'https://cdn.example.com/preloaded.js',
        rel: 'preload',
        getAttribute: (attr) => attr === 'as' ? 'script' : null
      }

      global.document.querySelectorAll = jest.fn((selector) => {
        if (selector === 'link[rel="preload"][as="script"]') {
          return [mockLink]
        }
        return []
      })

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        return []
      })

      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at init (https://cdn.example.com/preloaded.js:30:5)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      // Verify marked as preload type (no timing info initially)
      expect(result.type).toBe('preload')
      expect(result.asset).toBe('https://cdn.example.com/preloaded.js')
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('handles late PerformanceObserver callback for preloaded scripts', async () => {
      jest.resetModules()
      jest.useFakeTimers()

      // Setup: Preload link detected in DOM
      const mockLink = {
        href: 'https://cdn.example.com/late-preload.js',
        rel: 'preload'
      }

      global.document.querySelectorAll = jest.fn((selector) => {
        if (selector === 'link[rel="preload"][as="script"]') {
          return [mockLink]
        }
        return []
      })

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        return []
      })

      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at main (https://cdn.example.com/late-preload.js:50:10)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      // Initially marked as preload (no timing yet)
      expect(result.type).toBe('preload')
      expect(result.asset).toBe('https://cdn.example.com/late-preload.js')

      // Simulate observer callback arriving after initial check
      const lateEntry = {
        name: 'https://cdn.example.com/late-preload.js',
        initiatorType: 'script',
        startTime: 200.5,
        responseEnd: 350.9
      }

      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [lateEntry]
        })
      }

      // Result object mutated with actual timing data from observer
      expect(result.fetchStart).toBe(200)
      expect(result.fetchEnd).toBe(350)
      expect(result.type).toBe('script')

      jest.useRealTimers()
    })

    test('clears late observer subscribers after 10 seconds', async () => {
      jest.resetModules()
      jest.useFakeTimers()

      const mockLink = {
        href: 'https://cdn.example.com/timeout-test.js',
        rel: 'preload'
      }

      global.document.querySelectorAll = jest.fn((selector) => {
        if (selector === 'link[rel="preload"][as="script"]') {
          return [mockLink]
        }
        return []
      })

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at register (https://cdn.example.com/timeout-test.js:1:1)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Create a late observer subscription
      scriptTrackerModule.findScriptTimings()

      // Advance past 10-second timeout threshold
      jest.advanceTimersByTime(11000)

      // Trigger observer - should cleanup stale subscribers
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [{
            name: 'https://cdn.example.com/other.js',
            initiatorType: 'script',
            startTime: 100,
            responseEnd: 200
          }]
        })
      }

      jest.useRealTimers()
    })

    test('limits scripts Set to 250 entries', async () => {
      jest.resetModules()

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Generate 300 entries to exceed the limit
      const entries = []
      for (let i = 0; i < 300; i++) {
        entries.push({
          name: `https://cdn.example.com/script-${i}.js`,
          initiatorType: 'script',
          startTime: i,
          responseEnd: i + 50
        })
      }

      // Feed all entries to observer
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => entries
        })
      }

      // The Set enforces 250 limit, oldest entries dropped
      global.performance.getEntriesByType = jest.fn(() => [])

      // Try to find script-0.js (should be evicted)
      mockStack = `Error
    at test (https://cdn.example.com/script-0.js:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Script 0 evicted from Set, no timing info available
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('handles URL matching when entry URL ends with stack URL', () => {
      // Resource entry has full path
      const mockResourceEntry = {
        name: 'https://cdn.example.com/path/app.js',
        initiatorType: 'script',
        startTime: 100,
        responseEnd: 200
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Stack contains full URL matching the resource entry
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at func (https://cdn.example.com/path/app.js:5:10)`

      const result = scriptTrackerModule.findScriptTimings()

      // URL matching succeeds, timing info retrieved
      expect(result.fetchStart).toBe(100)
      expect(result.type).toBe('script')
    })

    test('handles URL matching when stack URL ends with entry URL', () => {
      // Resource entry has short relative name
      const mockResourceEntry = {
        name: 'app.js',
        initiatorType: 'script',
        startTime: 100,
        responseEnd: 200
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Stack has full URL that ends with entry name
      mockStack = `Error
    at func (https://cdn.example.com/path/app.js:5:10)`

      const result = scriptTrackerModule.findScriptTimings()

      // Reverse matching: stack URL ends with entry URL
      expect(result.fetchStart).toBe(100)
      expect(result.type).toBe('script')
    })

    test('handles gecko format stack traces', () => {
      const mockResourceEntry = {
        name: 'https://cdn.example.com/gecko-app.js',
        initiatorType: 'script',
        startTime: 75.3,
        responseEnd: 180.6
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Gecko/Firefox format: function@url:line:column (no "at" prefix)
      mockStack = `Error
findScriptTimings@internal:1:1
register@internal:2:2
init@https://cdn.example.com/gecko-app.js:20:10`

      const result = scriptTrackerModule.findScriptTimings()

      // Successfully parses Gecko format and finds timing
      expect(result.fetchStart).toBe(75)
      expect(result.fetchEnd).toBe(180)
      expect(result.asset).toBe('https://cdn.example.com/gecko-app.js')
    })

    test('handles chrome format stack traces', () => {
      const mockResourceEntry = {
        name: 'https://cdn.example.com/chrome-app.js',
        initiatorType: 'script',
        startTime: 90.1,
        responseEnd: 210.4
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Chrome/V8 format: "at function (url:line:column)"
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at Object.register (internal:2:2)
    at init (https://cdn.example.com/chrome-app.js:30:5)`

      const result = scriptTrackerModule.findScriptTimings()

      // Successfully parses Chrome format and finds timing
      expect(result.fetchStart).toBe(90)
      expect(result.fetchEnd).toBe(210)
      expect(result.asset).toBe('https://cdn.example.com/chrome-app.js')
    })

    test('handles stack with query parameters and hashes', () => {
      // Resource URL includes query parameters
      const mockResourceEntry = {
        name: 'https://cdn.example.com/app.js?v=1.2.3&cache=bust',
        initiatorType: 'script',
        startTime: 50,
        responseEnd: 150
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [mockResourceEntry]
        }
        return []
      })

      // Stack URL includes same query parameters
      mockStack = `Error
    at test (https://cdn.example.com/app.js?v=1.2.3&cache=bust:10:5)`

      const result = scriptTrackerModule.findScriptTimings()

      // URL matching handles query strings correctly
      expect(result.fetchStart).toBe(50)
      expect(result.type).toBe('script')
    })

    test('handles errors during stack parsing gracefully', () => {
      // Setup: Invalid stack format to trigger parsing error
      mockStack = 'Invalid stack format'

      const result = scriptTrackerModule.findScriptTimings()

      // Gracefully returns default values on error
      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
    })

    test('handles DOM errors when checking preload tags gracefully', () => {
      // Setup: querySelectorAll throws error
      global.document.querySelectorAll = jest.fn(() => {
        throw new Error('DOM error')
      })

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      // Should not throw, handles DOM errors gracefully
      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(0)
    })

    test('handles missing document gracefully', () => {
      // Setup: document API not available
      global.document = undefined

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Handles missing document without throwing
      expect(result.asset).toBeUndefined()
    })

    test('handles stack trace with no extractable URLs', () => {
      global.performance.getEntriesByType = jest.fn(() => [])

      // Stack contains no parsable URLs (anonymous/native functions)
      mockStack = `Error
    at <anonymous>
    at Function.apply (native)`

      const result = scriptTrackerModule.findScriptTimings()

      // Returns default values when no URLs found in stack
      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
    })

    test('ignores non-script and non-link resources in PerformanceObserver', async () => {
      jest.resetModules()

      // Setup: Various non-script resource types
      const mockEntries = [
        { name: 'https://example.com/style.css', initiatorType: 'css', startTime: 10, responseEnd: 50 },
        { name: 'https://example.com/image.png', initiatorType: 'img', startTime: 20, responseEnd: 80 },
        { name: 'https://example.com/data.json', initiatorType: 'fetch', startTime: 30, responseEnd: 90 }
      ]

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Feed non-script resources to observer
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => mockEntries
        })
      }

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://example.com/style.css:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Non-script resources ignored, no timing found
      expect(result.fetchStart).toBe(0)
    })

    test('handles link resources without .js extension', async () => {
      jest.resetModules()

      // Setup: Link resource without .js extension (CSS file)
      const mockLinkEntry = {
        name: 'https://cdn.example.com/styles.css',
        initiatorType: 'link',
        startTime: 50,
        responseEnd: 100
      }

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [mockLinkEntry]
        })
      }

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/styles.css:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Non-.js link resources ignored
      expect(result.fetchStart).toBe(0)
    })

    test('handles Error.stackTraceLimit modification', () => {
      // Setup: Custom stackTraceLimit
      const originalLimit = Error.stackTraceLimit
      Error.stackTraceLimit = 10

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/deep.js:1:1)`

      scriptTrackerModule.findScriptTimings()

      // Verify stackTraceLimit properly restored after use
      expect(Error.stackTraceLimit).toBe(10)

      Error.stackTraceLimit = originalLimit
    })

    test('handles Error.stackTraceLimit error gracefully', () => {
      // Setup: Make stackTraceLimit throw on access
      const originalDescriptor = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit')

      Object.defineProperty(Error, 'stackTraceLimit', {
        get: () => { throw new Error('Access denied') },
        set: () => { throw new Error('Access denied') },
        configurable: true
      })

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      // Should handle stackTraceLimit errors without throwing
      const result = scriptTrackerModule.findScriptTimings()

      expect(result).toBeDefined()

      // Cleanup: restore original property
      if (originalDescriptor) {
        Object.defineProperty(Error, 'stackTraceLimit', originalDescriptor)
      }
    })
  })

  describe('PerformanceObserver availability', () => {
    test('handles missing PerformanceObserver gracefully', async () => {
      jest.resetModules()
      // Setup: Environment without PerformanceObserver API
      global.PerformanceObserver = undefined
      global.window.PerformanceObserver = undefined

      global.performance = {
        now: jest.fn(() => Date.now()),
        getEntriesByType: jest.fn(() => [])
      }

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      // Works without PerformanceObserver, falls back to other methods
      expect(result.fetchStart).toBe(0)
    })

    test('handles PerformanceObserver without resource support', async () => {
      jest.resetModules()
      // Setup: PerformanceObserver exists but doesn't support 'resource' type
      global.PerformanceObserver = jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      }))
      global.PerformanceObserver.supportedEntryTypes = ['paint', 'navigation']

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      global.performance = {
        now: jest.fn(() => Date.now()),
        getEntriesByType: jest.fn(() => [])
      }

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Handles lack of resource support gracefully
      expect(result.fetchStart).toBe(0)
    })
  })
})
