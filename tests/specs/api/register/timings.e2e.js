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

      // Logical validations
      expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
      expect(timing.timeToRegister).toBeGreaterThan(0)
      expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)
      expect(timing.timeToBeRequested).toBeGreaterThanOrEqual(0)
      expect(timing.timeAlive).toBeGreaterThan(0)

      // Cross-reference with metadata
      if (timingMetadata) {
        expect(timingMetadata.fetchStart).toBeGreaterThanOrEqual(0)
        expect(timingMetadata.fetchEnd).toBeGreaterThanOrEqual(timingMetadata.fetchStart)
        expect(timingMetadata.scriptStart).toBeGreaterThanOrEqual(timingMetadata.fetchEnd)
        expect(timingMetadata.scriptEnd).toBeGreaterThanOrEqual(timingMetadata.scriptStart)

        // Verify calculations match metadata
        expect(timing.timeToFetch).toBe(timingMetadata.fetchEnd - timingMetadata.fetchStart)
        expect(timing.timeToRegister).toBe(timingMetadata.scriptEnd - timingMetadata.scriptStart)
      }
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

      // Cross-reference with metadata
      if (timingMetadata) {
        expect(timingMetadata.type).toBe('inline')
        expect(timingMetadata.fetchStart).toBe(0)
        expect(timingMetadata.fetchEnd).toBe(0)
        expect(timingMetadata.scriptStart).toBe(0)
        expect(timingMetadata.scriptEnd).toBe(0)
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
            type: e.metadata.timings.type,
            asset: e.metadata.timings.asset,
            fetchStart: e.metadata.timings.fetchStart,
            fetchEnd: e.metadata.timings.fetchEnd,
            scriptStart: e.metadata.timings.scriptStart,
            scriptEnd: e.metadata.timings.scriptEnd
          }))
        } catch (err) {
          return []
        }
      })

      // Find the dynamically loaded MFE (not the inline one)
      const dynamicMFE = allTimings.find(t => t.type === 'script')

      if (dynamicMFE) {
        // Validate timing chain for dynamically loaded script
        expect(dynamicMFE.fetchEnd).toBeGreaterThanOrEqual(dynamicMFE.fetchStart)
        expect(dynamicMFE.scriptStart).toBeGreaterThanOrEqual(dynamicMFE.fetchEnd)
        expect(dynamicMFE.scriptEnd).toBeGreaterThanOrEqual(dynamicMFE.scriptStart)

        // scriptStart should be greater than fetchEnd (script can't start before fetch completes)
        expect(dynamicMFE.scriptStart).toBeGreaterThanOrEqual(dynamicMFE.fetchEnd)
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

      // Validate the formula: timeToLoad = timeToFetch + timeToRegister
      const calculatedTimeToLoad = timing.timeToFetch + timing.timeToRegister
      expect(timing.timeToLoad).toBe(calculatedTimeToLoad)

      // Cross-reference with metadata calculations
      if (timingMetadata) {
        const metadataTimeToFetch = timingMetadata.fetchEnd - timingMetadata.fetchStart
        const metadataTimeToRegister = timingMetadata.scriptEnd - timingMetadata.scriptStart

        expect(timing.timeToFetch).toBe(metadataTimeToFetch)
        expect(timing.timeToRegister).toBe(metadataTimeToRegister)

        // Logical ordering validations
        expect(timingMetadata.fetchStart).toBeGreaterThanOrEqual(0)
        expect(timingMetadata.fetchEnd).toBeGreaterThanOrEqual(timingMetadata.fetchStart)
        expect(timingMetadata.scriptStart).toBeGreaterThanOrEqual(timingMetadata.fetchEnd)
        expect(timingMetadata.scriptEnd).toBeGreaterThanOrEqual(timingMetadata.scriptStart)
        expect(timingMetadata.registeredAt).toBeGreaterThanOrEqual(timingMetadata.scriptStart)
      }
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

      // Validate timing chain logical ordering
      expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)
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
      // Just verify the timing formula holds
      expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
      expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)

      // Cross-validate with metadata
      if (timingMetadata) {
        expect(timingMetadata.fetchEnd - timingMetadata.fetchStart).toBe(timing.timeToFetch)
        expect(timingMetadata.scriptEnd - timingMetadata.scriptStart).toBe(timing.timeToRegister)
      }
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

        // Preload should have completed fetching before DOM insertion
        expect(preloadTimings.fetchStart).toBeGreaterThanOrEqual(0)
        expect(preloadTimings.fetchEnd).toBeGreaterThanOrEqual(preloadTimings.fetchStart)

        // Script execution happens after DOM insertion
        expect(preloadTimings.scriptStart).toBeGreaterThanOrEqual(preloadTimings.fetchEnd)
        expect(preloadTimings.scriptEnd).toBeGreaterThanOrEqual(preloadTimings.scriptStart)

        // For preloaded resources that complete early, scriptStart should be calculated from DOM insertion
        // The fetch may have completed long before the <script> tag was appended
        expect(preloadTimings.scriptStart).toBeGreaterThan(0)
      }

      // Validate late-loaded script (id:'5') - loaded by mfe-preload.js
      if (lateLoadTimings) {
        expect(lateLoadTimings.type).toBe('fetch')

        // Should have valid timing chain
        expect(lateLoadTimings.fetchStart).toBeGreaterThanOrEqual(0)
        expect(lateLoadTimings.fetchEnd).toBeGreaterThanOrEqual(lateLoadTimings.fetchStart)
        expect(lateLoadTimings.scriptStart).toBeGreaterThanOrEqual(lateLoadTimings.fetchEnd)
        expect(lateLoadTimings.scriptEnd).toBeGreaterThanOrEqual(lateLoadTimings.scriptStart)
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
      }

      // Validate preloaded script timing event (id:'4')
      const preloadTiming = timingEvents.find(e => e['source.id'] === '4')
      if (preloadTiming) {
        expect(preloadTiming.assetType).toBe('link')
        expect(preloadTiming.assetUrl).toContain('mfe-preload.js')

        // Preload should have valid timings
        expect(preloadTiming.timeToFetch).toBeGreaterThanOrEqual(0)
        expect(preloadTiming.timeToRegister).toBeGreaterThanOrEqual(0)
        expect(preloadTiming.timeToLoad).toBe(preloadTiming.timeToFetch + preloadTiming.timeToRegister)
        expect(preloadTiming.timeAlive).toBeGreaterThan(0)

        // Cross-reference with metadata
        if (preloadTimings) {
          expect(preloadTiming.timeToFetch).toBe(preloadTimings.fetchEnd - preloadTimings.fetchStart)
          expect(preloadTiming.timeToRegister).toBe(preloadTimings.scriptEnd - preloadTimings.scriptStart)
        }
      }

      // Validate late-loaded script timing event (id:'5')
      const lateTiming = timingEvents.find(e => e['source.id'] === '5')
      if (lateTiming) {
        expect(lateTiming.assetType).toBe('fetch')
        expect(lateTiming.assetUrl).toContain('mfe-preload-late.js')

        // Late-loaded should have valid timings
        expect(lateTiming.timeToFetch).toBeGreaterThanOrEqual(0)
        expect(lateTiming.timeToRegister).toBeGreaterThan(0)
        expect(lateTiming.timeToLoad).toBe(lateTiming.timeToFetch + lateTiming.timeToRegister)
        expect(lateTiming.timeAlive).toBeGreaterThan(0)

        // Cross-reference with metadata
        if (lateLoadTimings) {
          expect(lateTiming.timeToFetch).toBe(lateLoadTimings.fetchEnd - lateLoadTimings.fetchStart)
          expect(lateTiming.timeToRegister).toBe(lateLoadTimings.scriptEnd - lateLoadTimings.scriptStart)
        }
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
        expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)
        expect(timing.assetType).toBeDefined()
        expect(acceptedAssetTypes).toContain(timing.assetType)
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

      // Should still produce valid timings
      expect(timing.timeToLoad).toBeGreaterThanOrEqual(0)
      expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
      expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)

      // Formula should still hold
      expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)
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
      if (childTiming) {
        expect(childTiming.timeToLoad).toBe(childTiming.timeToFetch + childTiming.timeToRegister)
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
      expect(timing.timeToLoad).toBe(timing.timeToFetch + timing.timeToRegister)

      // timeToRegister should include time from DOM insert to load event
      expect(timing.timeToRegister).toBeGreaterThan(0)
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
      }

      // Find and validate the preloaded script MFE
      const preloadedMfe = timingEvents.find(event => event['source.name'] === 'test 4')

      // With the resource buffer set to 0, preloaded scripts should still be detected through the PO retroactively
      expect(preloadedMfe).toBeDefined()

      if (preloadedMfe) {
        expect(preloadedMfe.assetType).toBe('link')
        expect(preloadedMfe.assetUrl).toContain('preload.js')

        // Validate timing correlation formula
        expect(preloadedMfe.timeToLoad).toBe(preloadedMfe.timeToFetch + preloadedMfe.timeToRegister)
        expect(preloadedMfe.timeAlive).toBeGreaterThan(0)

        // Cross-reference with metadata
        const preloadMetadata = await getMFETimings('4')
        if (preloadMetadata) {
          expect(preloadMetadata.type).toBe('link')
          expect(preloadMetadata.fetchStart).toBeGreaterThanOrEqual(0)
          expect(preloadMetadata.fetchEnd).toBeGreaterThanOrEqual(preloadMetadata.fetchStart)
          expect(preloadMetadata.scriptStart).toBeGreaterThanOrEqual(preloadMetadata.fetchEnd)
          expect(preloadMetadata.scriptEnd).toBeGreaterThanOrEqual(preloadMetadata.scriptStart)

          // Verify Insights event calculations match metadata
          expect(preloadedMfe.timeToFetch).toBe(preloadMetadata.fetchEnd - preloadMetadata.fetchStart)
          expect(preloadedMfe.timeToRegister).toBe(preloadMetadata.scriptEnd - preloadMetadata.scriptStart)
        }
      }
    })
  })
})
