/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  testMFEErrorsRequest,
  testMFEInsRequest,
  testMFEAjaxEventsRequest,
  testLogsRequest
} from '../../../../tools/testing-server/utils/expect-tests'
import { supportsLargestContentfulPaint, supportsCumulativeLayoutShift, supportsInteractionToNextPaint } from '../../../../tools/browser-matcher/common-matchers.mjs'

const SOURCE_ID = 'iframe-test'
const SOURCE_NAME = 'iframe test'

/**
 * Helper to get attribute value from an event's children array (used by AJAX events in querypack format).
 */
function getAttr (event, key) {
  const child = event.children?.find(c => c.key === key)
  return child?.value
}

/**
 * Load the registered iframe entity parent page with the given feature flags.
 * The iframe runs registered-iframe-entity.js automatically, which registers the entity,
 * fires addPageAction/recordCustomEvent/measure/log/fetch, throws an error, and on 'load'
 * inserts a spacer for CLS. The test is responsible for clicking (INP + LCP) and deregistering.
 */
async function loadIframePage (flags = ['register', 'register.jserrors'], initOverrides = {}) {
  await browser.url(await browser.testHandle.assetURL(
    'test-builds/browser-agent-wrapper/registered-iframe-entity.html',
    { init: { feature_flags: flags, ...initOverrides } }
  ))
  await browser.waitForAgentLoad()
}

/**
 * Perform a real WebDriver click inside the iframe (triggers INP + finalizes LCP via web-vitals),
 * wait briefly for the web-vitals whenIdle callbacks to fire, then call deregister() which
 * records the MicroFrontEndTiming event with all accumulated vitals.
 */
async function clickIframe () {
  const iframeEl = await browser.$('#mfe-iframe')
  await browser.switchToFrame(iframeEl)
  await browser.$('h1').click()
  await browser.switchToFrame(null)
}

/**
 * Perform two real WebDriver clicks inside the iframe, spaced out, to give web-vitals'
 * INP tracking real interactions to measure. The wrapper script debounces its
 * deregister-on-click handler, so these clicks don't finalize the report prematurely.
 */
async function clickIframeForINP () {
  const iframeEl = await browser.$('#mfe-iframe')
  await browser.switchToFrame(iframeEl)
  await browser.$('h1').click()
  await browser.pause(100)
  await browser.$('h1').click()
  await browser.switchToFrame(null)
}

describe('Register API - Iframe Entity', () => {
  beforeEach(async () => {
    await browser.enableLogging()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should capture an error thrown in the iframe via noticeError', async () => {
    const [mfeErrorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEErrorsRequest }
    ])

    await loadIframePage()

    const errorsHarvests = await mfeErrorsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allErrors = errorsHarvests.flatMap(h => h.request.body.err || [])

    const iframeError = allErrors.find(e => e.custom?.['source.id'] === SOURCE_ID)
    expect(iframeError).toBeDefined()
    expect(iframeError.custom['source.name']).toEqual(SOURCE_NAME)
    expect(iframeError.custom['source.type']).toEqual('MFE')
    expect(iframeError.params.message).toContain('test error from the iframe')

    // Stack trace is preserved through the postMessage channel and references the iframe script
    const stackTrace = iframeError.params.stack_trace
    expect(typeof stackTrace).toBe('string')
    expect(stackTrace.length).toBeGreaterThan(0)
    expect(stackTrace).toContain('registered-iframe-entity')
  })

  it('should capture a page action sent from the iframe entity', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const pageAction = allInsights.find(e => e.eventType === 'PageAction' && e['source.id'] === SOURCE_ID)
    expect(pageAction).toBeDefined()
    expect(pageAction.actionName).toEqual('IFRAME_ACTION')
    expect(pageAction['source.name']).toEqual(SOURCE_NAME)
    expect(pageAction['source.type']).toEqual('MFE')
    expect(pageAction.foo).toEqual('bar')
  })

  it('should capture a custom event sent from the iframe entity', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const customEvent = allInsights.find(e => e.eventType === 'IFRAME_CUSTOM_EVENT' && e['source.id'] === SOURCE_ID)
    expect(customEvent).toBeDefined()
    expect(customEvent['source.name']).toEqual(SOURCE_NAME)
    expect(customEvent['source.type']).toEqual('MFE')
    expect(customEvent.baz).toEqual('qux')
  })

  it('should capture a measure (BrowserPerformance) event sent from the iframe entity', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const measureEvent = allInsights.find(e =>
      e.eventType === 'BrowserPerformance' &&
      e.entryType === 'measure' &&
      e['source.id'] === SOURCE_ID
    )
    expect(measureEvent).toBeDefined()
    expect(measureEvent.entryName).toEqual('IFRAME_MEASURE')
    expect(measureEvent['source.name']).toEqual(SOURCE_NAME)
    expect(measureEvent['source.type']).toEqual('MFE')
  })

  it('should capture a log sent from the iframe entity', async () => {
    const [logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testLogsRequest }
    ])

    await loadIframePage()

    const logsHarvest = await logsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allLogs = logsHarvest.flatMap(h => JSON.parse(h.request.body)[0]?.logs || [])

    const iframeLog = allLogs.find(l => l.attributes?.['source.id'] === SOURCE_ID)
    expect(iframeLog).toBeDefined()
    expect(iframeLog.message).toContain('log message from the iframe')
    expect(iframeLog.attributes['source.name']).toEqual(SOURCE_NAME)
    expect(iframeLog.attributes['source.type']).toEqual('MFE')
  })

  it('should capture an ajax call made inside the iframe', async () => {
    const [mfeAjaxCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEAjaxEventsRequest }
    ])

    await loadIframePage()

    const ajaxHarvest = await mfeAjaxCapture.waitForResult({ totalCount: 1, timeout: 10000 })
    const allAjax = ajaxHarvest.flatMap(h => (Array.isArray(h.request.body) ? h.request.body : []))

    const iframeAjax = allAjax.find(r =>
      r.type === 'ajax' &&
      r.path?.includes('/json') &&
      getAttr(r, 'source.id') === SOURCE_ID
    )
    expect(iframeAjax).toBeDefined()
    expect(getAttr(iframeAjax, 'source.name')).toEqual(SOURCE_NAME)
    expect(getAttr(iframeAjax, 'source.type')).toEqual('MFE')
  })

  it('should capture a MicroFrontEndTiming event with page view timing data when the iframe entity deregisters', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()
    await clickIframe()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()
    expect(timingEvent['source.name']).toEqual(SOURCE_NAME)
    expect(timingEvent['source.type']).toEqual('MFE')

    // Page view timing properties
    expect(timingEvent.timeAlive).toBeGreaterThanOrEqual(0)
    expect(timingEvent.timeToRegister).toBeGreaterThanOrEqual(0)
    expect(timingEvent.timeToLoad).toBeGreaterThanOrEqual(0)
    expect(timingEvent.timeToFetch).toBeGreaterThanOrEqual(0)
    expect(timingEvent.timeToExecute).toBeGreaterThanOrEqual(0)
    expect(timingEvent.timeToBeRequested).toBeGreaterThanOrEqual(0)

    // Iframe vitals arrive as raw numbers via postMessage (not JSON-stringified objects).
    // FCP, LCP, CLS, INP: positive numbers on supporting browsers, null elsewhere.
    // Values are raw millisecond/score numbers, not JSON-stringified objects.
    const fcp = timingEvent['nr.vitals.fcp.value']
    const lcp = timingEvent['nr.vitals.lcp.value']
    const cls = timingEvent['nr.vitals.cls.value']
    const inp = timingEvent['nr.vitals.inp.value']
    expect(fcp === null || (typeof fcp === 'number' && fcp >= 0)).toBe(true)
    expect(lcp === null || (typeof lcp === 'number' && lcp >= 0)).toBe(true)
    expect(cls === null || (typeof cls === 'number' && cls >= 0)).toBe(true)
    expect(inp === null || (typeof inp === 'number' && inp >= 0)).toBe(true)
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should have positive FCP and LCP vital values from the iframe in supporting browsers', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()
    await clickIframe()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()

    // The iframe renders an <h1> — FCP and LCP must be positive on supporting browsers
    expect(timingEvent['nr.vitals.fcp.value']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.fcp.value']).toBe('number')
    expect(timingEvent['nr.vitals.fcp.value']).toBeGreaterThan(0)

    expect(timingEvent['nr.vitals.lcp.value']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.lcp.value']).toBe('number')
    expect(timingEvent['nr.vitals.lcp.value']).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsCumulativeLayoutShift)('should have a positive CLS score from the iframe layout shift in supporting browsers', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()
    await browser.pause(500)
    await clickIframe()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()

    // The load handler inserts a 200px spacer before existing content, causing a measurable
    // layout shift. The WebDriver click finalizes CLS reporting via web-vitals.
    expect(timingEvent['nr.vitals.cls.value']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.cls.value']).toBe('number')
    expect(timingEvent['nr.vitals.cls.value']).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsInteractionToNextPaint)('should have a positive INP score from real interactions in the iframe in supporting browsers', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()
    await browser.pause(500)
    await clickIframeForINP()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()

    // Two real WebDriver clicks give web-vitals something to measure. The wrapper's
    // debounced deregister handler waits for interactions to settle before reporting.
    expect(timingEvent['nr.vitals.inp.value']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.inp.value']).toBe('number')
    expect(timingEvent['nr.vitals.inp.value']).toBeGreaterThan(0)
  })

  it('should propagate setCustomAttribute, setUserId, and setApplicationVersion through the postMessage bridge', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()
    await browser.pause(1000)

    await browser.execute(function () {
      const iframe = document.getElementById('mfe-iframe')
      const entity = iframe.contentWindow.entity
      entity.setCustomAttribute('bridgeCustomAttr', 'bridgeValue')
      entity.setUserId('bridge-test-user')
      entity.setApplicationVersion('9.9.9')
      entity.addPageAction('BRIDGE_ATTR_CHECK', {})
    })

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 10000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const pageAction = allInsights.find(e =>
      e.eventType === 'PageAction' &&
      e.actionName === 'BRIDGE_ATTR_CHECK' &&
      e['source.id'] === SOURCE_ID
    )
    expect(pageAction).toBeDefined()
    expect(pageAction.bridgeCustomAttr).toEqual('bridgeValue')
    expect(pageAction['enduser.id']).toEqual('bridge-test-user')
    expect(pageAction['application.version']).toEqual('9.9.9')
  })

  it('should block registration when the iframe origin is not in the iframe_domains allowlist', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage(['register', 'register.jserrors'], {
      api: { register: { iframe_domains: ['http://not-the-real-origin.example'] } }
    })
    await browser.pause(1000)
    await clickIframe()

    // The parent agent should never have registered an entity for this iframe --
    // the origin check in the postMessage handler rejects it before agent.register() runs.
    const registeredOnParent = await browser.execute(function (sourceId) {
      const agent = Object.values(window.newrelic.initializedAgents)[0]
      return !!agent?.runtime?.registeredEntities?.some(e => e.metadata?.target?.id === sourceId)
    }, SOURCE_ID)
    expect(registeredOnParent).toBe(false)

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 4000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])
    const timingEvent = allInsights.find(e => e['source.id'] === SOURCE_ID)
    expect(timingEvent).toBeUndefined()
  })
})
