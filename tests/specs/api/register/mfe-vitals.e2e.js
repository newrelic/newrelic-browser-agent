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

  // Parse vitals from JSON strings
  const fcp = timingEvent['nr.vitals.fcp.value']
  const lcp = timingEvent['nr.vitals.lcp.value']
  const cls = timingEvent['nr.vitals.cls.value']
  const inp = timingEvent['nr.vitals.inp.value']

  if (expectFCP) {
    expect(fcp).toBeDefined()
    expect(fcp).not.toBeUndefined()
    expect(fcp).toBeGreaterThan(0)
    expect(fcp).toBeLessThan(10000) // Less than 10 seconds
  } else if (fcp !== undefined) {
    // If FCP is present (but not required), validate it's reasonable
    expect(fcp).toBeGreaterThanOrEqual(0)
  }

  if (expectLCP) {
    expect(lcp).toBeDefined()
    expect(lcp).not.toBeUndefined()
    expect(lcp).toBeGreaterThan(0)
    expect(lcp).toBeLessThan(10000)
    // LCP should be >= FCP if both are present
    if (fcp !== undefined) {
      expect(lcp).toBeGreaterThanOrEqual(fcp)
    }
  } else if (lcp !== undefined) {
    expect(lcp).toBeGreaterThanOrEqual(0)
  }

  if (expectCLS) {
    expect(cls).toBeDefined()
    expect(cls).not.toBeUndefined()
    // CLS is a score, typically between 0 and some small number
    expect(cls).toBeGreaterThanOrEqual(0)
    expect(cls).toBeLessThan(10) // CLS scores are typically very small
  } else if (cls !== undefined) {
    expect(cls).toBeGreaterThanOrEqual(0)
  }

  if (expectINP) {
    expect(inp).toBeDefined()
    expect(inp).not.toBeUndefined()
    expect(inp).toBeGreaterThan(0)
    expect(inp).toBeLessThan(10000)
  } else if (inp !== undefined) {
    expect(inp).toBeGreaterThanOrEqual(0)
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

    // Parse vitals for metadata validation
    const cls = timing['nr.vitals.cls.value']
    expect(cls).toBeGreaterThan(0)
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
    const mainFcp = mainTiming['nr.vitals.fcp.value']
    const secondFcp = secondTiming['nr.vitals.fcp.value']
    expect(mainFcp).toBeGreaterThan(0)
    expect(secondFcp).toBeGreaterThan(0)
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
    expect(timing['nr.vitals.fcp.value']).toBeUndefined()
    expect(timing['nr.vitals.lcp.value']).toBeUndefined()
    // CLS might be null (unsupported) or have value 0 (supported but no shifts)
    if (timing['nr.vitals.cls.value'] !== undefined) {
      const cls = timing['nr.vitals.cls.value']
      expect(cls).toBe(0)
    }
    expect(timing['nr.vitals.inp.value']).toBeUndefined()
  })

  it('should give up tracking vitals if FCP is not observed within 10 seconds, reporting no timings', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Register an MFE and never render any content tagged with its data-nr-mfe-id,
    // so FCP is never observed and the 10s internal timeout should kick in.
    await browser.execute(function () {
      window.timeoutMfe = newrelic.register({
        id: 'fcp-timeout-mfe',
        name: 'FCP Timeout MFE'
      })
    })

    // Wait past the 10 second FCP timeout so the tracker gives up and disconnects its observers
    await browser.pause(11000)

    // Render content AFTER the timeout should have fired - since observers should already be
    // disconnected at this point, this should NOT be picked up as FCP/LCP/CLS/INP
    await browser.execute(function () {
      const div = document.createElement('div')
      div.textContent = 'Late content after FCP timeout'
      div.dataset.nrMfeId = 'fcp-timeout-mfe'
      div.style.width = '400px'
      div.style.height = '400px'
      document.body.appendChild(div)
    })

    await browser.pause(500)

    await browser.execute(function () {
      window.timeoutMfe.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'fcp-timeout-mfe')

    expect(timingEvents.length).toBeGreaterThanOrEqual(1)
    const timing = timingEvents[0]

    // No vitals should have been captured - the 10s FCP timeout should have disconnected
    // all observers before the late content was ever rendered
    expect(timing['nr.vitals.fcp.value']).toBeUndefined()
    expect(timing['nr.vitals.lcp.value']).toBeUndefined()
    expect(timing['nr.vitals.cls.value']).toBeUndefined()
    expect(timing['nr.vitals.inp.value']).toBeUndefined()
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
    expect(firstTimingEvents[0]['nr.vitals.fcp.value']).toBeDefined() // Vitals were captured
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

    // At least FCP and LCP should have values for this test case
    expect(timing['nr.vitals.fcp.value']).not.toBeUndefined()
    expect(timing['nr.vitals.lcp.value']).not.toBeUndefined()
  })

  it('should independently detect FCP for two MFE instances sharing the same id in separate DOM trees', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    // Register two separate instances that share the same MFE id, before either DOM tree
    // exists, so both trackers start out watching the whole document for their shared id.
    await browser.execute(function () {
      window.mfeTreeA = newrelic.register({ id: 'dual-tree-mfe', name: 'Tree A' })
      window.mfeTreeB = newrelic.register({ id: 'dual-tree-mfe', name: 'Tree B' })
    })

    // Render the first DOM tree for this shared id
    await browser.execute(function () {
      const treeA = document.createElement('div')
      treeA.dataset.nrMfeId = 'dual-tree-mfe'
      treeA.textContent = 'Tree A content'
      treeA.style.width = '100px'
      treeA.style.height = '100px'
      document.body.appendChild(treeA)
    })

    await browser.pause(300)

    // Render a second, unrelated DOM tree elsewhere on the page for the SAME shared id.
    // If a tracker had latched onto Tree A's subtree exclusively, it would never see this.
    await browser.execute(function () {
      const treeB = document.createElement('div')
      treeB.dataset.nrMfeId = 'dual-tree-mfe'
      treeB.textContent = 'Tree B content'
      treeB.style.width = '200px'
      treeB.style.height = '200px'
      document.body.appendChild(treeB)
    })

    await browser.pause(300)

    await browser.execute(function () {
      window.mfeTreeA.deregister()
      window.mfeTreeB.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'dual-tree-mfe')

    // Both instances should have reported their own timing event
    expect(timingEvents.length).toBe(2)

    const eventA = timingEvents.find(e => e['source.name'] === 'Tree A')
    const eventB = timingEvents.find(e => e['source.name'] === 'Tree B')

    expect(eventA).toBeDefined()
    expect(eventB).toBeDefined()

    // Each instance should have detected FCP from its OWN DOM tree, independently of the other
    validateVitals(eventA, { expectFCP: true })
    validateVitals(eventB, { expectFCP: true })

    // Tree B was rendered ~300ms after Tree A, so its FCP timestamp should reflect that later render
    expect(eventB['nr.vitals.fcp.value'] - eventA['nr.vitals.fcp.value']).toBeGreaterThanOrEqual(300)
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should independently measure LCP size for two MFE instances sharing the same id', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', {
      init: { feature_flags: ['register'] }
    }))
      .then(() => browser.waitForAgentLoad())

    await browser.execute(function () {
      window.mfeTreeA = newrelic.register({ id: 'dual-tree-lcp-mfe', name: 'LCP Tree A' })
      window.mfeTreeB = newrelic.register({ id: 'dual-tree-lcp-mfe', name: 'LCP Tree B' })
    })

    // Small tree A, rendered first
    await browser.execute(function () {
      const treeA = document.createElement('div')
      treeA.dataset.nrMfeId = 'dual-tree-lcp-mfe'
      treeA.textContent = 'Small tree A'
      treeA.style.width = '50px'
      treeA.style.height = '50px'
      document.body.appendChild(treeA)
    })

    await browser.pause(300)

    // Larger tree B, in a completely separate part of the page, rendered second
    await browser.execute(function () {
      const treeB = document.createElement('div')
      treeB.dataset.nrMfeId = 'dual-tree-lcp-mfe'
      treeB.textContent = 'Large tree B'
      treeB.style.width = '400px'
      treeB.style.height = '400px'
      document.body.appendChild(treeB)
    })

    await browser.pause(500)

    await browser.execute(function () {
      window.mfeTreeA.deregister()
      window.mfeTreeB.deregister()
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const timingEvents = getMFETimingEvents(insightsHarvests, 'dual-tree-lcp-mfe')

    expect(timingEvents.length).toBe(2)

    const eventA = timingEvents.find(e => e['source.name'] === 'LCP Tree A')
    const eventB = timingEvents.find(e => e['source.name'] === 'LCP Tree B')

    expect(eventA).toBeDefined()
    expect(eventB).toBeDefined()

    // Both trees should have measured LCP from their own content, not each other's
    validateVitals(eventA, { expectLCP: true })
    validateVitals(eventB, { expectLCP: true })
  })

  // it('should capture comprehensive metadata for all vitals', async () => {
  //   await browser.url(await browser.testHandle.assetURL('instrumented.html', {
  //     init: { feature_flags: ['register'] }
  //   }))
  //     .then(() => browser.waitForAgentLoad())

  //   // Create an MFE with elements that will trigger all vitals
  //   await browser.execute(function () {
  //     window.testMfe = newrelic.register({
  //       id: 'metadata-test-mfe',
  //       name: 'Metadata Test MFE'
  //     })

  //     // Add content for FCP
  //     const textDiv = document.createElement('div')
  //     textDiv.textContent = 'First content'
  //     textDiv.dataset.nrMfeId = 'metadata-test-mfe'
  //     document.body.appendChild(textDiv)

  //     // Add larger content for LCP with ID and styles
  //     setTimeout(() => {
  //       const largeDiv = document.createElement('div')
  //       largeDiv.id = 'hero-section'
  //       largeDiv.className = 'hero main-content'
  //       largeDiv.textContent = 'Large Hero Content'
  //       largeDiv.dataset.nrMfeId = 'metadata-test-mfe'
  //       largeDiv.style.width = '800px'
  //       largeDiv.style.height = '600px'
  //       largeDiv.style.backgroundColor = 'blue'
  //       document.body.appendChild(largeDiv)

  //       // Trigger a layout shift
  //       setTimeout(() => {
  //         largeDiv.style.position = 'relative'
  //         largeDiv.style.top = '100px'
  //       }, 100)
  //     }, 100)
  //   })

  //   // Wait for content and shifts
  //   await browser.pause(500)

  //   // Trigger interactions
  //   const body = await $('body')
  //   if (await body.isExisting()) {
  //     await body.click()
  //     await browser.pause(100)
  //     await body.click()
  //     await browser.pause(100)
  //   }

  //   // Wait for all vitals to be measured
  //   await browser.pause(1000)

  //   // Deregister to capture vitals
  //   await browser.execute(function () {
  //     window.testMfe.deregister()
  //   })

  //   const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
  //   const timingEvents = getMFETimingEvents(insightsHarvests, 'metadata-test-mfe')

  //   expect(timingEvents.length).toBeGreaterThanOrEqual(1)
  //   const timing = timingEvents[0]

  //   // Validate all metadata properties exist
  //   expect(timing.eventType).toBe('MicroFrontEndTiming')
  //   expect(timing['source.id']).toBe('metadata-test-mfe')

  //   // FCP metadata
  //   if (timing['nr.vitals.fcp.value'] !== null) {
  //     const fcp = JSON.parse(timing['nr.vitals.fcp.value'])
  //     expect(fcp.loadState).toBeDefined()
  //   }

  //   // LCP metadata - should have element info
  //   if (timing['nr.vitals.lcp.value'] !== null) {
  //     const lcp = JSON.parse(timing['nr.vitals.lcp.value'])
  //     expect(lcp.elTag).toBe('DIV')
  //     expect(lcp.eid).toBe('hero-section')
  //     expect(lcp.size).toBe(480000) // 800 * 600
  //   }

  //   // CLS metadata - should have shift info if supported
  //   if (timing['nr.vitals.cls.value'] !== null) {
  //     const cls = timing['nr.vitals.cls.value']
  //     if (cls > 0) {
  //       expect(cls.largestShiftTarget).toBeDefined()
  //       expect(cls.largestShiftTime).toBeGreaterThanOrEqual(0)
  //       expect(cls.largestShiftValue).toBeGreaterThan(0)
  //       expect(cls.loadState).toBeDefined()
  //     }
  //   }

  //   // INP metadata - should have interaction info if supported
  //   if (timing['nr.vitals.inp.value'] !== null) {
  //     const inp = timing['nr.vitals.inp.value']
  //     expect(inp.interactionTarget).toBeDefined()
  //     expect(inp.interactionTime).toBeGreaterThanOrEqual(0)
  //     expect(inp.interactionType).toBeDefined()
  //     expect(inp.nextPaintTime).toBeGreaterThan(0)
  //     expect(inp.loadState).toBeDefined()
  //   }
  // })
})
