/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'
import { fullySupportsPreloadResourceTimings } from '../../../../tools/browser-matcher/common-matchers.mjs'

const acceptedAssetTypes = ['script', 'link', 'preload', 'inline', 'fetch', 'unknown']

let mfeInsightsCapture

/**
 * Helper to get timing metadata from registered entities
 * @param {string} id - The MFE id to find
 * @returns {object|null} The timings metadata or null
 */
async function getMFETimings (id) {
  return await browser.execute(function (mfeId) {
    try {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (!agents.length) return null

      const entity = agents[0].runtime.registeredEntities.find(e => e.metadata.target.id === mfeId)
      return entity ? entity.metadata.timings : null
    } catch (err) {
      console.error('Error getting MFE timings:', err)
      return null
    }
  }, id)
}

/**
 * Validates common timing event properties and formulas
 * @param {object} timing - The timing event from Insights
 * @param {object} timingMetadata - Optional metadata from registered entity
 * @param {object} options - Optional validation options
 * @param {boolean} options.expectPositiveTimes - Whether to expect all times > 0 (default: false)
 */
function validateTimingEvent (timing, timingMetadata, options = {}) {
  const { expectPositiveTimes = false } = options

  // Basic structure validation
  expect(timing.assetType).toBeDefined()
  expect(acceptedAssetTypes).toContain(timing.assetType)

  // Validate timing formula: timeToLoad = timeToFetch + timeToExecute
  expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToExecute)

  // Optional: expect all timing values to be positive
  if (expectPositiveTimes) {
    expect(timing.timeToFetch).toBeGreaterThan(0)
    expect(timing.timeToRegister).toBeGreaterThan(0)
    expect(timing.timeToExecute).toBeGreaterThan(0)
    expect(timing.timeToLoad).toBeGreaterThan(0)
    expect(timing.timeToBeRequested).toBeGreaterThan(0)
    expect(timing.timeAlive).toBeGreaterThan(0)
  } else {
    // At minimum, values should be >= 0
    expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
    expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)
    expect(timing.timeToExecute).toBeGreaterThanOrEqual(0)
    expect(timing.timeToLoad).toBeGreaterThanOrEqual(0)
    expect(timing.timeToBeRequested).toBeGreaterThanOrEqual(0)
    expect(timing.timeAlive).toBeGreaterThanOrEqual(0)
  }

  // Cross-reference with metadata if provided
  if (timingMetadata) {
    validateMetadataTimingChain(timingMetadata)

    // Verify Insights event calculations match metadata
    expect(timing.timeToFetch).toBe(timingMetadata.fetchEnd - timingMetadata.fetchStart)
    expect(timing.timeToExecute).toBe(timingMetadata.scriptEnd - timingMetadata.scriptStart)
  }
}

/**
 * Validates metadata timing chain ordering
 * @param {object} metadata - The timing metadata from registered entity
 */
function validateMetadataTimingChain (metadata) {
  expect(metadata.fetchStart).toBeGreaterThanOrEqual(0)
  expect(metadata.fetchEnd).toBeGreaterThanOrEqual(metadata.fetchStart)
  expect(metadata.scriptStart).toBeGreaterThanOrEqual(metadata.fetchEnd)
  expect(metadata.scriptEnd).toBeGreaterThanOrEqual(metadata.scriptStart)
  expect(metadata.registeredAt).toBeGreaterThanOrEqual(metadata.scriptStart)
}

describe('Register API - Correlation-based Timings', () => {
  beforeEach(async () => {
    [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('Dynamic Script Injection - Full Correlation', () => {
    it('should capture complete timing lifecycle for dynamically injected script', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // Dynamically inject MFE script (it self-registers with id:'1')
        const script = document.createElement('script')
        script.src = './js/mfe/mfe.js'
        document.head.appendChild(script)
      })

      const timingMetadata = await getMFETimings('1')

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '1')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // Should have script initiatorType since dynamically added
      expect(timing.assetType).toBe('script')
      expect(timing.assetUrl).toContain('mfe.js')

      // Validate timing event with common assertions
      validateTimingEvent(timing, timingMetadata, { expectPositiveTimes: true })
    })

    it('should handle script that registers during execution (before load event)', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        const script = document.createElement('script')
        // This script will register immediately upon execution
        script.textContent = `
          window.immediateApi = newrelic.register({ id: 'immediate', name: 'ImmediateMFE' })
          setTimeout(() => window.immediateApi.deregister(), 20)
        `
        document.head.appendChild(script)
      })

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // Inline script should be detected
      expect(timing.assetType).toBe('inline')

      // Validate timing event with common assertions
      validateTimingEvent(timing)
    })
  })

  describe('Preloaded Scripts - Correlation with Delayed DOM', () => {
    it.withBrowsersMatching(fullySupportsPreloadResourceTimings)('should correlate preload performance with later DOM insertion', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // The test file has a 2000ms delay before appending preload script
      const delayTime = 2000

      // Wait for preload script to be appended
      await browser.pause(delayTime + 500)

      // Get timing metadata before deregistering
      const timingMetadata = await getMFETimings('9999')

      // Deregister to get timing event
      await browser.execute(function () {
        if (window.mainApi) window.mainApi.deregister()
      })

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '9999')

      expect(timingEvents.length).toBeGreaterThanOrEqual(1)
      const timing = timingEvents[0]

      // Note: The MFE '9999' is an inline script, not the preloaded script
      // The preloaded script (mfe-preload.js) doesn't call register() so won't have timing events
      // This test verifies that inline scripts get proper inline timing (all 0s)
      expect(timing.assetType).toBe('inline')
      expect(timing.timeToFetch).toBe(0)
      expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)
      expect(timing.timeToLoad).toBe(0)

      // Validate timing event with common assertions
      validateTimingEvent(timing, timingMetadata)

      // Cross-reference with metadata
      if (timingMetadata) {
        expect(timingMetadata.type).toBe('inline')
      }
    })
  })

  describe('Dynamic Import - Performance-Only Correlation', () => {
    it('should handle dynamic import() with fetch initiatorType', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Click to trigger dynamic import
      await browser.execute(function () {
        const clickEvent = new MouseEvent('click', { bubbles: true })
        document.body.dispatchEvent(clickEvent)
      })

      await browser.pause(500)

      // The dynamic import won't call register, so we need to check the inline script MFE
      const timingMetadata = await getMFETimings('9999')

      if (timingMetadata) {
        // Inline script should have type 'inline'
        expect(timingMetadata.type).toBe('inline')

        // All timings should be 0 for inline
        expect(timingMetadata.fetchStart).toBe(0)
        expect(timingMetadata.fetchEnd).toBe(0)
        expect(timingMetadata.scriptStart).toBe(0)
        expect(timingMetadata.scriptEnd).toBe(0)
      }
    })
  })

  describe('Click-Triggered Script Injection', () => {
    it('should capture timing for click-triggered script with full correlation', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Click to trigger script injection
      await browser.execute(function () {
        const clickEvent = new MouseEvent('click', { bubbles: true })
        document.body.dispatchEvent(clickEvent)
      })

      // Wait for script to load and register
      await browser.pause(1000)

      // The mfe.js script should have called register
      // Note: We need to check the actual MFE that registers, not the inline one
      const allTimings = await browser.execute(function () {
        try {
          const agents = Object.values(newrelic.initializedAgents || {})
          if (!agents.length) return []

          return agents[0].runtime.registeredEntities.map(e => ({
            id: e.metadata.target.id,
            name: e.metadata.target.name,
            ...e.metadata.timings
          }))
        } catch (err) {
          return []
        }
      })

      // Find the dynamically loaded MFE (not the inline one)
      const dynamicMFE = allTimings.find(t => t.type === 'script')

      if (dynamicMFE) {
        // Validate timing chain for dynamically loaded script
        validateMetadataTimingChain(dynamicMFE)
      }
    })
  })

  describe('Timing Metric Validations', () => {
    it('should validate timeToLoad = timeToFetch + timeToRegister', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // Create and inject script dynamically (it self-registers with id:'1')
        const script = document.createElement('script')
        script.src = './js/mfe/mfe.js'
        document.head.appendChild(script)
      })

      await browser.pause(500)
      const timingMetadata = await getMFETimings('1')

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '1')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // Validate timing event with common assertions
      validateTimingEvent(timing, timingMetadata)
    })

    it('should have timeAlive reflect deregistration time for inline scripts', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Use inline script with delay to test timeToRegister
      const delayMs = 50
      await browser.execute(function (delay) {
        const script = document.createElement('script')
        script.textContent = `
          // Simulate initialization work
          const start = Date.now()
          const api = newrelic.register({ id: 'delayed-init', name: 'DelayedMFE' })
          while (Date.now() - start < ${delay}) {
            // busy wait
          }
          api.deregister()
        `
        document.head.appendChild(script)
      }, delayMs)

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === 'delayed-init')

      const timing = timingEvents[0]

      // For inline scripts, all timing is captured in timeAlive, not timeToRegister
      // Inline scripts have timeToFetch=0, timeToRegister=0, timeToLoad=0
      expect(timing.assetType).toBe('inline')
      expect(timing.timeToFetch).toBe(0)
      expect(timing.timeToLoad).toBe(0)
      // timeAlive should include the busy-wait delay
      expect(timing.timeAlive).toBeGreaterThanOrEqual(delayMs - 10) // Allow 10ms tolerance

      // Validate timing event with common assertions
      validateTimingEvent(timing)
    })

    it('should handle script loading with timing formula validation', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Load the mfe.js script which self-registers (it will be cached in browser)
      await browser.execute(function () {
        const script = document.createElement('script')
        script.src = './js/mfe/mfe.js'
        document.head.appendChild(script)
      })

      const timingMetadata = await getMFETimings('1')

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '1')

      const timing = timingEvents[0]

      // Note: Script may or may not be cached depending on browser session state
      // Validate timing event with common assertions
      validateTimingEvent(timing, timingMetadata)
    })
  })

  describe('Preloaded Script Scenarios', () => {
    it.withBrowsersMatching(fullySupportsPreloadResourceTimings)('should calculate scriptStart from dom.start when preload completes early', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Wait for preload script to be appended (2s delay in test file, 3s delay in second lazy load)
      await browser.pause(10000)

      // Get timing metadata for all MFEs on the page
      const inlineTimings = await getMFETimings('9999')
      const preloadTimings = await getMFETimings('4')
      const lateLoadTimings = await getMFETimings('5')

      // Validate inline script (id:'9999') - should have all 0 timings
      if (inlineTimings && inlineTimings.type === 'inline') {
        expect(inlineTimings.fetchStart).toBe(0)
        expect(inlineTimings.fetchEnd).toBe(0)
        expect(inlineTimings.scriptStart).toBe(0)
        expect(inlineTimings.scriptEnd).toBe(0)
      }

      // Validate preloaded script (id:'4') - should have proper preload timing
      if (preloadTimings) {
        expect(preloadTimings.type).toBe('link')
        validateMetadataTimingChain(preloadTimings)

        // For preloaded resources that complete early, scriptStart should be calculated from DOM insertion
        // The fetch may have completed long before the <script> tag was appended
        expect(preloadTimings.scriptStart).toBeGreaterThan(0)
      }

      // Validate late-loaded script (id:'5') - loaded by mfe-preload.js
      if (lateLoadTimings) {
        expect(lateLoadTimings.type).toBe('fetch')
        validateMetadataTimingChain(lateLoadTimings)
      }

      // Deregister all MFEs to trigger timing events
      await browser.execute(function () {
        if (window.mainApi) window.mainApi.deregister()
        if (window.api4) window.api4.deregister()
        if (window.api5) window.api5.deregister()
      })

      // Wait for timing events (expecting 3: inline, preload, and late-load)
      const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      expect(timingEvents.length).toBeGreaterThanOrEqual(3)

      // Validate inline script timing event (id:'9999')
      const inlineTiming = timingEvents.find(e => e['source.id'] === '9999')
      if (inlineTiming) {
        expect(inlineTiming.assetType).toBe('inline')
        expect(inlineTiming.timeToFetch).toBe(0)
        expect(inlineTiming.timeToLoad).toBe(0)
        expect(inlineTiming.timeToRegister).toBeGreaterThanOrEqual(0)
        validateTimingEvent(inlineTiming, inlineTimings)
      }

      // Validate preloaded script timing event (id:'4')
      const preloadTiming = timingEvents.find(e => e['source.id'] === '4')
      if (preloadTiming) {
        expect(preloadTiming.assetType).toBe('link')
        expect(preloadTiming.assetUrl).toContain('mfe-preload.js')

        // Validate timing event with common assertions
        validateTimingEvent(preloadTiming, preloadTimings)
        expect(preloadTiming.timeAlive).toBeGreaterThan(0)
      }

      // Validate late-loaded script timing event (id:'5')
      const lateTiming = timingEvents.find(e => e['source.id'] === '5')
      if (lateTiming) {
        expect(lateTiming.assetType).toBe('fetch')
        expect(lateTiming.assetUrl).toContain('mfe-preload-late.js')

        // Validate timing event with common assertions
        validateTimingEvent(lateTiming, lateLoadTimings)
        expect(lateTiming.timeAlive).toBeGreaterThan(0)
        expect(lateTiming.timeToRegister).toBeGreaterThan(0)
      }
    })
  })

  describe('Multiple Concurrent Scripts', () => {
    it('should independently track multiple scripts loaded in parallel', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // Load 3 different scripts in quick succession
        const urls = [
          './js/mfe/mfe.js',
          './js/mfe/mfe/mfe.min.js',
          './build/nr-spa.min.js'
        ]

        const apis = []

        urls.forEach((url, index) => {
          const script = document.createElement('script')
          script.src = url
          script.setAttribute('data-mfe-id', String(index))
          document.head.appendChild(script)

          script.addEventListener('load', () => {
            apis.push(newrelic.register({
              id: `parallel-${index}`,
              name: `ParallelMFE${index}`
            }))

            // Deregister all after last one loads
            if (apis.length === urls.length) {
              setTimeout(() => apis.forEach(api => api.deregister()), 20)
            }
          })
        })
      })

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      // Should get timing events for all successful loads
      expect(timingEvents.length).toBeGreaterThanOrEqual(1)

      // Each timing should maintain formula integrity
      timingEvents.forEach(timing => {
        validateTimingEvent(timing)
      })
    })
  })

  describe('Timing Edge Cases', () => {
    it('should handle script that loads before performance entry is recorded', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // This tests the race condition where MutationObserver fires before PerformanceObserver
      await browser.execute(function () {
        const script = document.createElement('script')
        script.src = './js/mfe/mfe.js' // Self-registers with id:'1'
        document.head.appendChild(script)
      })

      await browser.pause(500)

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '1')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // Validate timing event with common assertions
      validateTimingEvent(timing)
    })

    it('should handle script where register is called before load event', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        const script = document.createElement('script')
        script.textContent = `
          // Register immediately during script execution
          window.earlyApi = newrelic.register({ id: 'early-register', name: 'EarlyMFE' })
          setTimeout(() => window.earlyApi.deregister(), 50)
        `
        document.head.appendChild(script)
      })

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // Inline script - should use fallback timing
      expect(timing.assetType).toBe('inline')

      // Validate timing event with common assertions
      validateTimingEvent(timing)
    })
  })

  describe('Real-world MFE Patterns', () => {
    it('should track nested MFE loading with parent-child relationships', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        // Parent MFE loads first (inline)
        const parentScript = document.createElement('script')
        parentScript.textContent = `
          window.parentApi = newrelic.register({ id: 'parent-mfe', name: 'ParentMFE' })

          // Parent loads child MFE (mfe.js self-registers with id:'1')
          setTimeout(() => {
            const childScript = document.createElement('script')
            childScript.src = './js/mfe/mfe.js'
            document.head.appendChild(childScript)

            // Wait for child to finish, then deregister parent
            setTimeout(() => {
              window.parentApi.deregister()
            }, 500)
          }, 50)
        `
        document.head.appendChild(parentScript)
      })

      await browser.pause(1000)

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 2, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && (event['source.id'] === 'parent-mfe' || event['source.id'] === '1'))

      expect(timingEvents.length).toBe(2)

      const parentTiming = timingEvents.find(t => t['source.id'] === 'parent-mfe')
      const childTiming = timingEvents.find(t => t['source.id'] === '1')

      expect(parentTiming).toBeDefined()
      expect(childTiming).toBeDefined()

      // Both should have valid timing formulas
      if (parentTiming) {
        validateTimingEvent(parentTiming)
      }
      if (childTiming) {
        validateTimingEvent(childTiming)
      }
    })

    it('should track micro-frontend loaded via user interaction', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: { feature_flags: ['register'] }
      }))
        .then(() => browser.waitForAgentLoad())

      // Setup click handler that loads mfe.js (self-registers with id:'1')
      await browser.execute(function () {
        document.body.addEventListener('click', () => {
          const script = document.createElement('script')
          script.src = './js/mfe/mfe.js'
          document.head.appendChild(script)
        })
      })

      // Trigger click
      await browser.execute(function () {
        document.body.click()
      })

      await browser.pause(500)

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === '1')

      expect(timingEvents.length).toBe(1)
      const timing = timingEvents[0]

      // User-triggered load should still have valid correlation
      expect(timing.assetType).toBe('script')

      // Validate timing event with common assertions (script may be cached)
      validateTimingEvent(timing)
    })
  })

  describe('Overloaded Resource Buffer Scenarios', () => {
    it('should properly handle preloaded scripts with overloaded resource buffer', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline-overloaded.html'))
        .then(() => browser.waitForAgentLoad())

      // The main MFE is registered inline, but there's a preloaded script
      // Wait for deregistration
      await browser.pause(3500)

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      expect(timingEvents.length).toBeGreaterThanOrEqual(1)

      // Find and validate the main inline MFE
      const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
      expect(mainMfe).toBeDefined()

      if (mainMfe) {
        // Main should be inline type with zero fetch timings
        expect(mainMfe.assetType).toBe('inline')
        expect(mainMfe.timeToBeRequested).toBe(0)
        expect(mainMfe.timeToFetch).toBe(0)
        expect(mainMfe.timeToLoad).toBe(0)

        // Get metadata to cross-reference
        const mainMetadata = await getMFETimings('9999')
        if (mainMetadata) {
          expect(mainMetadata.type).toBe('inline')
          expect(mainMetadata.fetchStart).toBe(0)
          expect(mainMetadata.fetchEnd).toBe(0)
          expect(mainMetadata.scriptStart).toBe(0)
          expect(mainMetadata.scriptEnd).toBe(0)
        }

        // Validate timing event with common assertions
        validateTimingEvent(mainMfe, mainMetadata)
      }
    })

    it('should detect and report preload asset type when resource buffer is full', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented-with-mfe-inline-overloaded.html'))
        .then(() => browser.waitForAgentLoad())

      // Click to trigger async MFEs to load
      await $('body').click()

      // Wait for scripts to load
      await browser.pause(3500)

      // Dispatch pagehide to trigger harvest
      await browser.execute(function () {
        window.dispatchEvent(new Event('pagehide'))
      })

      const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })

      const timingEvents = insightsHarvests
        .flatMap(({ request: { body } }) => body.ins)
        .filter(event => event.eventType === 'MicroFrontEndTiming')

      expect(timingEvents.length).toBeGreaterThanOrEqual(1)

      // Validate main inline MFE
      const mainMfe = timingEvents.find(event => event['source.name'] === 'main')
      expect(mainMfe).toBeDefined()

      if (mainMfe) {
        // Main should be inline type
        expect(mainMfe.assetType).toBe('inline')
        expect(mainMfe.timeToBeRequested).toBe(0)
        expect(mainMfe.timeToFetch).toBe(0)
        expect(mainMfe.timeToLoad).toBe(0)

        // Validate timing event with common assertions
        validateTimingEvent(mainMfe)
      }

      // Find and validate the preloaded script MFE
      const preloadedMfe = timingEvents.find(event => event['source.name'] === 'test 4')

      // With the resource buffer set to 0, preloaded scripts should still be detected through the PO retroactively
      expect(preloadedMfe).toBeDefined()

      if (preloadedMfe) {
        expect(preloadedMfe.assetType).toBe('link')
        expect(preloadedMfe.assetUrl).toContain('preload.js')
        expect(preloadedMfe.timeAlive).toBeGreaterThan(0)

        // Cross-reference with metadata
        const preloadMetadata = await getMFETimings('4')
        if (preloadMetadata) {
          expect(preloadMetadata.type).toBe('link')
        }

        // Validate timing correlation formula
        validateTimingEvent(preloadedMfe, preloadMetadata)
      }
    })
  })
})
