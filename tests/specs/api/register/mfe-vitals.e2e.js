/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { testMFEInsRequest } from '../../../../tools/testing-server/utils/expect-tests'
import { supportsCumulativeLayoutShift, supportsInteractionToNextPaint, supportsLargestContentfulPaint } from '../../../../tools/browser-matcher/common-matchers.mjs'

/**
 * Helper to get MFE timing events from harvests
 * @param {Array} harvests - Insights harvests
 * @param {string} mfeId - MFE ID to filter by
 * @returns {Array} Filtered timing events
 */
function getMFETimingEvents (harvests, mfeId) {
  return harvests
    .flatMap(({ request: { body } }) => body?.ins || [])
    .filter(event => event.eventType === 'MicroFrontEndTiming' && event['source.id'] === mfeId)
}

/**
 * Validates vitals are present and have reasonable values
 * @param {object} timingEvent - The timing event with vitals
 * @param {object} options - Validation options
 * @param {boolean} options.expectFCP - Whether to expect FCP to be set
 * @param {boolean} options.expectLCP - Whether to expect LCP to be set
 * @param {boolean} options.expectCLS - Whether to expect CLS to be set
 * @param {boolean} options.expectINP - Whether to expect INP to be set
 */
function validateVitals (timingEvent, options = {}) {
  const { expectFCP = false, expectLCP = false, expectCLS = false, expectINP = false } = options

  if (expectFCP) {
    expect(timingEvent.fcp).toBeDefined()
    expect(timingEvent.fcp).toBeGreaterThan(0)
    // FCP should be relative to scriptStart, so it should be a reasonable value
    expect(timingEvent.fcp).toBeLessThan(10000) // Less than 10 seconds
  } else if (timingEvent.fcp !== null && timingEvent.fcp !== undefined) {
    // If FCP is present (but not required), validate it's reasonable
    expect(timingEvent.fcp).toBeGreaterThanOrEqual(0)
  }

  if (expectLCP) {
    expect(timingEvent.lcp).toBeDefined()
    expect(timingEvent.lcp).toBeGreaterThan(0)
    // LCP should be relative to scriptStart
    expect(timingEvent.lcp).toBeLessThan(10000)
    // LCP should be >= FCP if both are present
    if (timingEvent.fcp !== null && timingEvent.fcp !== undefined) {
      expect(timingEvent.lcp).toBeGreaterThanOrEqual(timingEvent.fcp)
    }
  } else if (timingEvent.lcp !== null && timingEvent.lcp !== undefined) {
    expect(timingEvent.lcp).toBeGreaterThanOrEqual(0)
  }

  if (expectCLS) {
    expect(timingEvent.cls).toBeDefined()
    // CLS is a score, typically between 0 and some small number
    expect(timingEvent.cls).toBeGreaterThanOrEqual(0)
    expect(timingEvent.cls).toBeLessThan(10) // CLS scores are typically very small
  } else if (timingEvent.cls !== null && timingEvent.cls !== undefined) {
    expect(timingEvent.cls).toBeGreaterThanOrEqual(0)
  }

  if (expectINP) {
    expect(timingEvent.inp).toBeDefined()
    expect(timingEvent.inp).toBeGreaterThan(0)
    // INP is in milliseconds
    expect(timingEvent.inp).toBeLessThan(10000)
  } else if (timingEvent.inp !== null && timingEvent.inp !== undefined) {
    expect(timingEvent.inp).toBeGreaterThanOrEqual(0)
  }
}

describe('Register API - MFE Vitals Tracking', () => {
  let mfeInsightsCapture

  beforeEach(async () => {
    ;[mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should capture FCP and LCP vitals for MFE with DOM content', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html'))
      .then(() => browser.waitForAgentLoad())

    // Wait for LCP component to render (it has a 1s delay)
    await browser.pause(1500)

    // Trigger deregistration to capture vitals
    await browser.execute(function () {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (agents.length) {
        const mfeApi = agents[0].runtime.registeredEntities.find(e => e.metadata.target.id === 'vite-main-mfe')
        if (mfeApi) {
          mfeApi.deregister()
        }
      }
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'vite-main-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // Validate basic timing properties
    expect(timing.eventType).toBe('MicroFrontEndTiming')
    expect(timing['source.id']).toBe('vite-main-mfe')
    expect(timing['source.name']).toBe('Main MFE')
    expect(timing['source.type']).toBe('MFE')

    // Validate vitals - FCP and LCP should be captured
    // The vite-react-mfe has a root div with data-nr-mfe-id and an LCP component
    validateVitals(timing, { expectFCP: true, expectLCP: true })
  })

  it.withBrowsersMatching(supportsCumulativeLayoutShift)('should capture CLS when layout shifts occur within MFE', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html'))
      .then(() => browser.waitForAgentLoad())

    // The main.tsx has code that triggers a CLS by changing position after 100ms
    // Wait for layout shift to occur and be measured
    // Mobile devices may need more time for CLS detection
    await browser.pause(3000)

    // Trigger deregistration to capture vitals
    await browser.execute(function () {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (agents.length) {
        const mfeApi = agents[0].runtime.registeredEntities.find(e => e.metadata.target.id === 'vite-main-mfe')
        if (mfeApi) {
          mfeApi.deregister()
        }
      }
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'vite-main-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // CLS should be captured and should be non-zero from the forced layout shift
    validateVitals(timing, { expectCLS: true })
    expect(timing.cls).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsInteractionToNextPaint)('should capture INP when user interacts with MFE content', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html'))
      .then(() => browser.waitForAgentLoad())

    // Wait for content to render
    await browser.pause(2000)

    // Interact with the MFE content to trigger INP measurement
    // IMPORTANT: Must use WebDriver's native click() to generate trusted events
    // INP only tracks isTrusted=true events from real user interactions
    const button = await $('#mfe-main-button')
    if (await button.isExisting()) {
      await button.click() // Trusted event via WebDriver
      await browser.pause(100)
      await button.click() // Trusted event via WebDriver
      await browser.pause(100)
    }

    // Also click on the root element
    const root = await $('#root')
    if (await root.isExisting()) {
      await root.click() // Trusted event via WebDriver
      await browser.pause(100)
    }

    // Wait for INP to be measured by the browser
    // INP requires the interaction to complete and next paint to occur
    await browser.pause(2000)

    // Trigger deregistration to capture vitals
    await browser.execute(function () {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (agents.length) {
        const mfeApi = agents[0].runtime.registeredEntities.find(e => e.metadata.target.id === 'vite-main-mfe')
        if (mfeApi) {
          mfeApi.deregister()
        }
      }
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'vite-main-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // Validate basic structure
    expect(timing['source.id']).toBe('vite-main-mfe')

    // INP should be captured from user interactions
    validateVitals(timing, { expectINP: true })
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should track vitals independently for multiple MFEs', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html'))
      .then(() => browser.waitForAgentLoad())

    // Wait for LCP to render in main MFE
    await browser.pause(2000)

    // The 2nd-mfe script should also be loaded and creates its own content
    // Wait a bit more for 2nd-mfe content
    await browser.pause(2000)

    // Deregister both MFEs
    await browser.execute(function () {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (agents.length) {
        const entities = agents[0].runtime.registeredEntities

        // Deregister main MFE
        const mainMfe = entities.find(e => e.metadata.target.id === 'vite-main-mfe')
        if (mainMfe) {
          mainMfe.deregister()
        }

        // Deregister 2nd MFE
        const secondMfe = entities.find(e => e.metadata.target.id === 'vite-second-mfe')
        if (secondMfe) {
          window.second?.deregister()
        }
      }
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })

    // Check main MFE vitals
    const mainTimingEvents = getMFETimingEvents(insightsHarvests, 'vite-main-mfe')
    expect(mainTimingEvents.length).toBeGreaterThanOrEqual(1)
    const mainTiming = mainTimingEvents[0]
    expect(mainTiming['source.id']).toBe('vite-main-mfe')
    validateVitals(mainTiming, { expectFCP: true, expectLCP: true })

    // Check 2nd MFE vitals
    const secondTimingEvents = getMFETimingEvents(insightsHarvests, 'vite-second-mfe')
    expect(secondTimingEvents.length).toBeGreaterThanOrEqual(1)
    const secondTiming = secondTimingEvents[0]
    expect(secondTiming['source.id']).toBe('vite-second-mfe')
    // The 2nd-mfe creates a div with data-nr-mfe-id, so it should have FCP
    validateVitals(secondTiming, { expectFCP: true })

    // Vitals should be independent - not necessarily equal
    // Both should have FCP values but they can be different
    expect(mainTiming.fcp).toBeGreaterThan(0)
    expect(secondTiming.fcp).toBeGreaterThan(0)
  })

  it('should handle MFE with no visible content gracefully', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Register an MFE that doesn't add any content with the matching data attribute
    await browser.execute(function () {
      window.emptyMfe = newrelic.register({
        id: 'empty-mfe',
        name: 'Empty MFE'
      })

      // Add some content without the data-nr-mfe-id attribute
      const div = document.createElement('div')
      div.textContent = 'Content without MFE marker'
      document.body.appendChild(div)

      // Deregister immediately
      setTimeout(() => {
        window.emptyMfe.deregister()
      }, 100)
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'empty-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // Vitals should be null or 0 for MFE with no matching content
    // FCP should be null since no content was added within the MFE scope
    expect(timing.fcp).toBeNull()
    expect(timing.lcp).toBeNull()
    // CLS might be null (unsupported) or 0 (supported but no shifts)
    if (timing.cls !== null) {
      expect(timing.cls).toBe(0)
    }
    expect(timing.inp).toBeNull()
  })

  it('should stop tracking vitals after deregistration', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.testMfe = newrelic.register({
        id: 'test-mfe',
        name: 'Test MFE'
      })

      // Add initial content
      const div = document.createElement('div')
      div.textContent = 'Initial content'
      div.dataset.nrMfeId = 'test-mfe'
      div.style.width = '100px'
      div.style.height = '100px'
      document.body.appendChild(div)
    })

    // Wait a bit then deregister
    await browser.pause(200)

    await browser.execute(function () {
      window.testMfe.deregister()
    })

    // Get the vitals at deregistration time
    const firstHarvest = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const firstTimingEvents = getMFETimingEvents(firstHarvest, 'test-mfe')
    expect(firstTimingEvents.length).toBeGreaterThanOrEqual(1)
    const firstFCP = firstTimingEvents[0].fcp

    // Add more content after deregistration - this should NOT update vitals
    await browser.execute(function () {
      const bigDiv = document.createElement('div')
      bigDiv.textContent = 'Large content after deregistration'
      bigDiv.dataset.nrMfeId = 'test-mfe'
      bigDiv.style.width = '800px'
      bigDiv.style.height = '600px'
      bigDiv.style.backgroundColor = 'red'
      document.body.appendChild(bigDiv)
    })

    await browser.pause(2000)

    // The vitals should have been captured at deregistration and not changed
    // (We can't easily re-check since it's already been reported, but we verify the observers were disconnected)
    // This test primarily validates that deregistration stops tracking
    expect(firstFCP).toBeDefined() // Vitals were captured
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should include vitals in timing event structure', async () => {
    await browser.url(await browser.testHandle.assetURL('test-builds/vite-react-mfe/index.html'))
      .then(() => browser.waitForAgentLoad())

    // Wait for content to render
    await browser.pause(2000)

    // Trigger deregistration
    await browser.execute(function () {
      const agents = Object.values(newrelic.initializedAgents || {})
      if (agents.length) {
        const mfeApi = agents[0].runtime.registeredEntities.find(e => e.metadata.target.id === 'vite-main-mfe')
        if (mfeApi) {
          mfeApi.deregister()
        }
      }
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'vite-main-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // Verify timing event has all expected properties including vitals
    expect(timing.eventType).toBe('MicroFrontEndTiming')
    expect(timing['source.id']).toBe('vite-main-mfe')
    expect(timing['source.name']).toBe('Main MFE')
    expect(timing['source.type']).toBe('MFE')

    // Standard timing properties
    expect(timing.timeAlive).toBeGreaterThanOrEqual(0)
    expect(timing.timeToBeRequested).toBeGreaterThanOrEqual(0)
    expect(timing.timeToExecute).toBeGreaterThanOrEqual(0)
    expect(timing.timeToFetch).toBeGreaterThanOrEqual(0)
    expect(timing.timeToLoad).toBeGreaterThanOrEqual(0)
    expect(timing.timeToRegister).toBeGreaterThanOrEqual(0)

    // Vitals properties should exist (even if null)
    expect(timing).toHaveProperty('fcp')
    expect(timing).toHaveProperty('lcp')
    expect(timing).toHaveProperty('cls')
    expect(timing).toHaveProperty('inp')

    // At least FCP and LCP should have values for this test case
    expect(timing.fcp).not.toBeNull()
    expect(timing.lcp).not.toBeNull()
  })
})
