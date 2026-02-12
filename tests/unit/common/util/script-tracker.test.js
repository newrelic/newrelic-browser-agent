/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment node
 */

let performanceObserverCallback
let scriptTrackerModule
let mockStack = null

// Helper to construct error with custom stack
const OriginalError = global.Error
class MockError extends OriginalError {
  constructor (...args) {
    super(...args)
    if (mockStack !== null) {
      this.stack = mockStack
    }
  }
}

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
  performanceObserverCallback = null
  mockStack = null

  // Mock global scope
  global.Error = MockError
  MockError.stackTraceLimit = OriginalError.stackTraceLimit

  global.window = {
    performance: {
      now: jest.fn(() => Date.now()),
      getEntriesByType: jest.fn(() => [])
    },
    document: {
      querySelectorAll: jest.fn(() => [])
    },
    PerformanceObserver: jest.fn((callback) => {
      performanceObserverCallback = callback
      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      }
    }),
    Error: MockError
  }

  global.window.PerformanceObserver.supportedEntryTypes = ['resource']
  global.performance = global.window.performance
  global.document = global.window.document
  global.PerformanceObserver = global.window.PerformanceObserver
})

afterEach(() => {
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
      mockStack = undefined

      const result = scriptTrackerModule.findScriptTimings()

      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
      expect(result.registeredAt).toBeGreaterThan(0)
    })

    test('identifies inline script when URL matches navigation', () => {
      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/page.html' }]
        }
        return []
      })

      // Mock stack trace that includes the navigation URL
      mockStack = `Error
    at findScriptTimings (https://example.com/page.html:10:15)
    at callFunction (https://example.com/page.html:20:5)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.type).toBe('inline')
      expect(result.asset).toBe('https://example.com/page.html')
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('finds script timing from performance.getEntriesByType', () => {
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

      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at Object.register (internal:5:10)
    at main (https://cdn.example.com/mfe-app.js:15:20)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(100)
      expect(result.fetchEnd).toBe(250)
      expect(result.asset).toBe('https://cdn.example.com/mfe-app.js')
      expect(result.type).toBe('script')
    })

    test('finds script timing from PerformanceObserver scripts set', async () => {
      // Need to reimport to trigger PerformanceObserver setup
      jest.resetModules()
      const mockResourceEntry = {
        name: 'https://cdn.example.com/tracked-app.js',
        initiatorType: 'script',
        startTime: 150.2,
        responseEnd: 300.7
      }

      global.performance.getEntriesByType = jest.fn((type) => {
        if (type === 'navigation') {
          return [{ initiatorType: 'navigation', name: 'https://example.com/' }]
        }
        if (type === 'resource') {
          return [] // Not in static buffer
        }
        return []
      })

      // Set mockStack before importing/calling
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:10:5)
    at init (https://cdn.example.com/tracked-app.js:25:10)`

      // Reimport to set up observer
      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Simulate PerformanceObserver callback being triggered
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [mockResourceEntry]
        })
      }

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(150)
      expect(result.fetchEnd).toBe(300)
      expect(result.asset).toBe('https://cdn.example.com/tracked-app.js')
      expect(result.type).toBe('script')
    })

    test('handles link resources with .js extension', async () => {
      jest.resetModules()

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

      // Set mockStack before importing
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at setup (https://cdn.example.com/preload.js:10:5)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      // Trigger observer with link entry
      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => [mockLinkEntry]
        })
      }

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.type).toBe('link')
      expect(result.asset).toBe('https://cdn.example.com/preload.js')
    })

    test('identifies preloaded scripts and sets type to preload', async () => {
      jest.resetModules()

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

      // Set mockStack before importing
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at init (https://cdn.example.com/preloaded.js:30:5)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.type).toBe('preload')
      expect(result.asset).toBe('https://cdn.example.com/preloaded.js')
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('handles late PerformanceObserver callback for preloaded scripts', async () => {
      jest.resetModules()
      jest.useFakeTimers()

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

      // Set mockStack before importing
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at main (https://cdn.example.com/late-preload.js:50:10)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      // Initially should be preload type
      expect(result.type).toBe('preload')
      expect(result.asset).toBe('https://cdn.example.com/late-preload.js')

      // Simulate late PerformanceObserver callback
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

      // The result object should be mutated with the new timing info
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

      // Set mockStack before importing
      mockStack = `Error
    at register (https://cdn.example.com/timeout-test.js:1:1)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      scriptTrackerModule.findScriptTimings()

      // Advance time by 11 seconds
      jest.advanceTimersByTime(11000)

      // Trigger observer with an unrelated entry - this should clear the old subscriber
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

      // Generate 300 script entries
      const entries = []
      for (let i = 0; i < 300; i++) {
        entries.push({
          name: `https://cdn.example.com/script-${i}.js`,
          initiatorType: 'script',
          startTime: i,
          responseEnd: i + 50
        })
      }

      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => entries
        })
      }

      // The Set should be limited and old entries should be removed
      // We can verify this by checking that super old scripts aren't found
      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/script-0.js:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Script 0 should have been dropped, so we shouldn't find timing info
      expect(result.fetchStart).toBe(0)
      expect(result.fetchEnd).toBe(0)
    })

    test('handles URL matching when entry URL ends with stack URL', () => {
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

      // Stack URL is shorter - just the filename, while entry has full path
      // Tests that cdn.example.com/path/app.js ends with /path/app.js
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at register (internal:2:2)
    at func (https://cdn.example.com/path/app.js:5:10)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(100)
      expect(result.type).toBe('script')
    })

    test('handles URL matching when stack URL ends with entry URL', () => {
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

      mockStack = `Error
    at func (https://cdn.example.com/path/app.js:5:10)`

      const result = scriptTrackerModule.findScriptTimings()

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

      // Gecko format: function@url:line:column
      mockStack = `Error
findScriptTimings@internal:1:1
register@internal:2:2
init@https://cdn.example.com/gecko-app.js:20:10`

      const result = scriptTrackerModule.findScriptTimings()

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

      // Chrome format: at function (url:line:column)
      mockStack = `Error
    at findScriptTimings (internal:1:1)
    at Object.register (internal:2:2)
    at init (https://cdn.example.com/chrome-app.js:30:5)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(90)
      expect(result.fetchEnd).toBe(210)
      expect(result.asset).toBe('https://cdn.example.com/chrome-app.js')
    })

    test('handles stack with query parameters and hashes', () => {
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

      mockStack = `Error
    at test (https://cdn.example.com/app.js?v=1.2.3&cache=bust:10:5)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(50)
      expect(result.type).toBe('script')
    })

    test('handles errors during stack parsing gracefully', () => {
      // Mock a stack that will cause an error during processing
      mockStack = 'Invalid stack format'

      const result = scriptTrackerModule.findScriptTimings()

      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
    })

    test('handles DOM errors when checking preload tags gracefully', () => {
      global.document.querySelectorAll = jest.fn(() => {
        throw new Error('DOM error')
      })

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      // Should not throw
      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(0)
    })

    test('handles missing document gracefully', () => {
      global.document = undefined

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.asset).toBeUndefined()
    })

    test('handles stack trace with no extractable URLs', () => {
      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at <anonymous>
    at Function.apply (native)`

      const result = scriptTrackerModule.findScriptTimings()

      expect(result).toMatchObject({
        fetchStart: 0,
        fetchEnd: 0,
        asset: undefined,
        type: 'unknown'
      })
    })

    test('ignores non-script and non-link resources in PerformanceObserver', async () => {
      jest.resetModules()

      const mockEntries = [
        { name: 'https://example.com/style.css', initiatorType: 'css', startTime: 10, responseEnd: 50 },
        { name: 'https://example.com/image.png', initiatorType: 'img', startTime: 20, responseEnd: 80 },
        { name: 'https://example.com/data.json', initiatorType: 'fetch', startTime: 30, responseEnd: 90 }
      ]

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      if (performanceObserverCallback) {
        performanceObserverCallback({
          getEntries: () => mockEntries
        })
      }

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://example.com/style.css:1:1)`

      const result = scriptTrackerModule.findScriptTimings()

      // Should not find timing info for non-script resources
      expect(result.fetchStart).toBe(0)
    })

    test('handles link resources without .js extension', async () => {
      jest.resetModules()

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

      // Should not find .css links
      expect(result.fetchStart).toBe(0)
    })

    test('handles Error.stackTraceLimit modification', () => {
      const originalLimit = Error.stackTraceLimit
      Error.stackTraceLimit = 10

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/deep.js:1:1)`

      scriptTrackerModule.findScriptTimings()

      // Should restore original limit (or set to 50 and then restore)
      expect(Error.stackTraceLimit).toBe(10)

      Error.stackTraceLimit = originalLimit
    })

    test('handles Error.stackTraceLimit error gracefully', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit')

      Object.defineProperty(Error, 'stackTraceLimit', {
        get: () => { throw new Error('Access denied') },
        set: () => { throw new Error('Access denied') },
        configurable: true
      })

      global.performance.getEntriesByType = jest.fn(() => [])

      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      // Should not throw even if stackTraceLimit access fails
      const result = scriptTrackerModule.findScriptTimings()

      expect(result).toBeDefined()

      if (originalDescriptor) {
        Object.defineProperty(Error, 'stackTraceLimit', originalDescriptor)
      }
    })
  })

  describe('PerformanceObserver availability', () => {
    test('handles missing PerformanceObserver gracefully', async () => {
      jest.resetModules()
      global.PerformanceObserver = undefined
      global.window.PerformanceObserver = undefined

      global.performance = {
        now: jest.fn(() => Date.now()),
        getEntriesByType: jest.fn(() => [])
      }

      // Set mockStack before importing
      mockStack = `Error
    at test (https://cdn.example.com/test.js:1:1)`

      scriptTrackerModule = await import('../../../../src/common/util/script-tracker')

      const result = scriptTrackerModule.findScriptTimings()

      expect(result.fetchStart).toBe(0)
    })

    test('handles PerformanceObserver without resource support', async () => {
      jest.resetModules()
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

      expect(result.fetchStart).toBe(0)
    })
  })
})
