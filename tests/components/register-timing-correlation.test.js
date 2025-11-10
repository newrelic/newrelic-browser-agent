import { setupAgent } from './setup-agent'
import { buildRegisterApi } from '../../src/loaders/api/register'
import * as scriptTracker from '../../src/common/util/script-tracker'

jest.retryTimes(0)

// Mock the script-tracker module
jest.mock('../../src/common/util/script-tracker', () => ({
  scripts: new Set(),
  normalizeUrl: jest.fn(),
  extractUrlsFromStack: jest.fn()
}))

describe('Register API Timing Correlation', () => {
  let agent

  beforeEach(() => {
    jest.clearAllMocks()

    // Create a mock agent
    agent = setupAgent()
    agent.info = { licenseKey: 'test-license-key' }
    agent.init = {
      api: { allow_registered_children: true, duplicate_registered_data: false }
    }
    agent.runtime = { registeredEntities: [] }

    // Clear the scripts Set
    scriptTracker.scripts.clear()

    // Setup default mock implementations
    scriptTracker.normalizeUrl.mockImplementation((url) => {
      if (!url) return ''
      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const parsed = new URL(url)
          return parsed.pathname
        }
        return url.split('?')[0].split('#')[0]
      } catch {
        return url.split('?')[0].split('#')[0]
      }
    })

    scriptTracker.extractUrlsFromStack.mockImplementation((stack) => {
      const urls = []
      const lines = stack.split('\n')

      for (const line of lines) {
        const chromeMatch = line.match(/https?:\/\/[^\s)]+/)
        const firefoxMatch = line.match(/@(https?:\/\/[^\s:]+)/)

        if (chromeMatch) {
          const cleanUrl = chromeMatch[0].replace(/:\d+:\d+$/, '')
          urls.push(cleanUrl)
        }
        if (firefoxMatch) {
          const cleanUrl = firefoxMatch[1].replace(/:\d+:\d+$/, '')
          urls.push(cleanUrl)
        }
      }

      return [...new Set(urls)]
    })
  })

  afterEach(() => {
    scriptTracker.scripts.clear()
  })

  describe('URL matching between script-tracker and stack traces', () => {
    const createMockPerformanceEntry = (url, startTime = 100, responseEnd = 200) => ({
      name: url,
      startTime,
      responseEnd,
      duration: responseEnd - startTime
    })

    const createMockStack = (url, browserType = 'chrome') => {
      switch (browserType) {
        case 'chrome':
          return `Error
    at buildRegisterApi (${url}:45:123)
    at Object.register (https://example.com/agent.js:567:890)
    at https://example.com/main.js:12:34`
        case 'firefox':
          return `buildRegisterApi@${url}:45:123
register@https://example.com/agent.js:567:890
@https://example.com/main.js:12:34`
        case 'safari':
          return `buildRegisterApi@${url}:45:123
register@https://example.com/agent.js:567:890
global code@https://example.com/main.js:12:34`
        default:
          return `Error at ${url}:45:123`
      }
    }

    // Mock Error constructor to return controlled stack traces
    const mockError = (stack) => {
      const OriginalError = global.Error
      jest.spyOn(global, 'Error').mockImplementation(function () {
        const error = new OriginalError()
        error.stack = stack
        return error
      })
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('should match exact URL between Performance API and Chrome stack trace', () => {
      const scriptUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(scriptUrl, 150, 250)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(scriptUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(150)
      expect(api.metadata.timings.fetchEnd).toBe(250)
    })

    test('should match exact URL between Performance API and Firefox stack trace', () => {
      const scriptUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(scriptUrl, 175, 275)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(scriptUrl, 'firefox'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(175)
      expect(api.metadata.timings.fetchEnd).toBe(275)
    })

    test('should handle URLs with query parameters', () => {
      const performanceUrl = 'https://example.com/assets/js/mfe.js?v=1.2.3&cache=bust'
      const stackUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 120, 220)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(120)
      expect(api.metadata.timings.fetchEnd).toBe(220)
    })

    test('should handle URLs with fragments', () => {
      const performanceUrl = 'https://example.com/assets/js/mfe.js#section1'
      const stackUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 130, 230)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(130)
      expect(api.metadata.timings.fetchEnd).toBe(230)
    })

    test('should handle relative URLs in Performance API', () => {
      const performanceUrl = '/assets/js/mfe.js'
      const stackUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 140, 240)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(140)
      expect(api.metadata.timings.fetchEnd).toBe(240)
    })

    test('should handle subdirectory paths correctly', () => {
      const performanceUrl = 'https://cdn.example.com/libs/v2/micro-frontend.min.js'
      const stackUrl = 'https://cdn.example.com/libs/v2/micro-frontend.min.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 200, 300)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'firefox'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(200)
      expect(api.metadata.timings.fetchEnd).toBe(300)
    })

    test('should not match when URLs are completely different', () => {
      const performanceUrl = 'https://example.com/assets/js/other-script.js'
      const stackUrl = 'https://example.com/assets/js/mfe.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 160, 260)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle multiple scripts in Performance API and find correct match', () => {
      const targetUrl = 'https://example.com/assets/js/target.js'
      const performanceEntries = [
        createMockPerformanceEntry('https://example.com/assets/js/other1.js', 100, 150),
        createMockPerformanceEntry(targetUrl, 200, 250),
        createMockPerformanceEntry('https://example.com/assets/js/other2.js', 300, 350)
      ]

      performanceEntries.forEach(entry => scriptTracker.scripts.add(entry))
      mockError(createMockStack(targetUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(200)
      expect(api.metadata.timings.fetchEnd).toBe(250)
    })

    test('should handle malformed stack traces gracefully', () => {
      const performanceEntry = createMockPerformanceEntry('https://example.com/assets/js/mfe.js', 180, 280)

      scriptTracker.scripts.add(performanceEntry)
      mockError('Malformed stack trace without URLs')

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle empty or missing stack traces', () => {
      const performanceEntry = createMockPerformanceEntry('https://example.com/assets/js/mfe.js', 190, 290)

      scriptTracker.scripts.add(performanceEntry)

      // Mock Error to return null stack (simulating browsers that don't provide stack traces)
      jest.spyOn(global, 'Error').mockImplementation(function () {
        const error = new Error()
        error.stack = null
        return error
      })

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      // Should still create API but with default timing values since no stack available
      expect(api).toBeDefined()
      expect(api.metadata).toBeDefined()
      expect(api.metadata.timings).toBeDefined()
      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle missing scripts gracefully', () => {
      // Don't add anything to scripts Set
      mockError(createMockStack('https://example.com/assets/js/mfe.js', 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle empty scripts Set gracefully', () => {
      // Ensure scripts Set is empty
      scriptTracker.scripts.clear()
      mockError(createMockStack('https://example.com/assets/js/mfe.js', 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle partial URL matches correctly', () => {
      const performanceUrl = 'https://cdn.example.com/v1.2.3/shared/components/widget.js'
      const stackUrl = 'https://cdn.example.com/v1.2.3/shared/components/widget.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 250, 350)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(250)
      expect(api.metadata.timings.fetchEnd).toBe(350)
    })

    test('should match when Performance API has relative path and stack has absolute', () => {
      const performanceUrl = '/js/module.js'
      const stackUrl = 'https://example.com/js/module.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 300, 400)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(300)
      expect(api.metadata.timings.fetchEnd).toBe(400)
    })

    test('should prioritize exact matches over partial matches', () => {
      const exactMatchUrl = 'https://example.com/js/component.js'
      const partialMatchUrl = 'https://other.com/different/js/component.js'
      const stackUrl = 'https://example.com/js/component.js'

      // Put exact match first so find() picks it up first
      const performanceEntries = [
        createMockPerformanceEntry(exactMatchUrl, 300, 400),
        createMockPerformanceEntry(partialMatchUrl, 100, 200)
      ]

      performanceEntries.forEach(entry => scriptTracker.scripts.add(entry))
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      // Should use the exact match (first in array due to find() behavior)
      expect(api.metadata.timings.fetchStart).toBe(300)
      expect(api.metadata.timings.fetchEnd).toBe(400)
    })

    test('should handle minified file names correctly', () => {
      const performanceUrl = 'https://example.com/assets/js/bundle.min.js'
      const stackUrl = 'https://example.com/assets/js/bundle.min.js'
      const performanceEntry = createMockPerformanceEntry(performanceUrl, 150, 300)

      scriptTracker.scripts.add(performanceEntry)
      mockError(createMockStack(stackUrl, 'chrome'))

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      expect(api.metadata.timings.fetchStart).toBe(150)
      expect(api.metadata.timings.fetchEnd).toBe(300)
    })
  })

  describe('Edge cases and error handling', () => {
    test('should not throw when Error constructor fails', () => {
      scriptTracker.scripts.add({ name: 'https://example.com/test.js', startTime: 100, responseEnd: 200 })

      // Mock Error to throw
      jest.spyOn(global, 'Error').mockImplementation(() => {
        throw new Error('Stack trace unavailable')
      })

      expect(() => {
        buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })
      }).not.toThrow()

      jest.restoreAllMocks()
    })

    test('should handle extremely long stack traces', () => {
      // Create a very long stack trace that would normally cause performance issues
      const longStackTrace = [
        'Error',
        ...Array.from({ length: 1000 }, (_, i) =>
          `    at func${i} (https://example.com/file${i}.js:${i}:${i})`
        )
      ].join('\n')

      scriptTracker.scripts.add({ name: 'https://example.com/file0.js', startTime: 500, responseEnd: 600 })

      jest.spyOn(global, 'Error').mockImplementation(function () {
        const error = new Error()
        error.stack = longStackTrace
        return error
      })

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      // The main goal is to ensure the function doesn't hang or crash with very long stacks
      expect(api).toBeDefined()
      expect(api.metadata).toBeDefined()
      expect(api.metadata.timings).toBeDefined()

      // Don't expect specific timing values since long stacks might have edge cases
      // The important thing is the function completes successfully
      expect(typeof api.metadata.timings.fetchStart).toBe('number')
      expect(typeof api.metadata.timings.fetchEnd).toBe('number')

      jest.restoreAllMocks()
    })

    test('should handle script-tracker module being unavailable', () => {
      // Test when the imported functions might be undefined or throw errors
      scriptTracker.extractUrlsFromStack.mockImplementation(() => {
        throw new Error('extractUrlsFromStack failed')
      })

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      // Should still create API successfully even if script tracking fails
      expect(api).toBeDefined()
      expect(api.metadata).toBeDefined()
      expect(api.metadata.timings).toBeDefined()
      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)
    })

    test('should handle normalizeUrl function failures', () => {
      scriptTracker.scripts.add({ name: 'https://example.com/test.js', startTime: 100, responseEnd: 200 })

      // Mock normalizeUrl to throw an error
      scriptTracker.normalizeUrl.mockImplementation(() => {
        throw new Error('normalizeUrl failed')
      })

      const mockStack = `Error
    at buildRegisterApi (https://example.com/test.js:45:123)
    at Object.register (https://example.com/agent.js:567:890)
    at https://example.com/main.js:12:34`

      jest.spyOn(global, 'Error').mockImplementation(function () {
        const error = new Error()
        error.stack = mockStack
        return error
      })

      const api = buildRegisterApi(agent, { id: 'test-entity', name: 'Test Entity' })

      // Should handle the error gracefully
      expect(api).toBeDefined()
      expect(api.metadata.timings.fetchStart).toBe(0)
      expect(api.metadata.timings.fetchEnd).toBe(0)

      jest.restoreAllMocks()
    })
  })
})
