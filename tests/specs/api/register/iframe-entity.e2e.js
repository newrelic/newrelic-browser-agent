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
import { supportsLargestContentfulPaint, supportsCumulativeLayoutShift } from '../../../../tools/browser-matcher/common-matchers.mjs'

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
 * The iframe (registered-iframe-entity-iframe.html) runs registered-iframe-entity.js automatically, which:
 *  - Registers with id 'iframe-test', name 'iframe test'
 *  - Calls addPageAction, recordCustomEvent, measure, log, and fetch
 *  - Throws an error (captured via global error listener → noticeError)
 *  - Calls deregister() after 3 seconds (triggers MicroFrontEndTiming harvest)
 */
async function loadIframePage (flags = ['register', 'register.jserrors']) {
  await browser.url(await browser.testHandle.assetURL(
    'test-builds/browser-agent-wrapper/registered-iframe-entity.html',
    { init: { feature_flags: flags } }
  ))
  await browser.waitForAgentLoad()
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

    // The iframe deregisters after 3 seconds — wait long enough to collect the MicroFrontEndTiming harvest
    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 15000 })
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
    // INP: always null — no user interaction in the sense web-vitals tracks (click happens but
    // onINP only fires for interactions with a presentation delay, not programmatic clicks)
    expect(timingEvent['nr.vitals.inp']).toBeNull()
    // FCP, LCP, CLS: positive numbers on supporting browsers, null elsewhere.
    // Values are raw millisecond/score numbers, not JSON-stringified objects.
    const fcp = timingEvent['nr.vitals.fcp']
    const lcp = timingEvent['nr.vitals.lcp']
    const cls = timingEvent['nr.vitals.cls']
    expect(fcp === null || (typeof fcp === 'number' && fcp > 0)).toBe(true)
    expect(lcp === null || (typeof lcp === 'number' && lcp > 0)).toBe(true)
    expect(cls === null || (typeof cls === 'number' && cls > 0)).toBe(true)
  })

  it.withBrowsersMatching(supportsLargestContentfulPaint)('should have positive FCP and LCP vital values from the iframe in supporting browsers', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 15000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()

    // The iframe renders an <h1> — FCP and LCP must be positive on supporting browsers
    expect(timingEvent['nr.vitals.fcp']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.fcp']).toBe('number')
    expect(timingEvent['nr.vitals.fcp']).toBeGreaterThan(0)

    expect(timingEvent['nr.vitals.lcp']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.lcp']).toBe('number')
    expect(timingEvent['nr.vitals.lcp']).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsCumulativeLayoutShift)('should have a positive CLS score from the iframe layout shift in supporting browsers', async () => {
    const [mfeInsightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testMFEInsRequest }
    ])

    await loadIframePage()

    const insightsHarvests = await mfeInsightsCapture.waitForResult({ timeout: 15000 })
    const allInsights = insightsHarvests.flatMap(h => h.request.body?.ins || [])

    const timingEvent = allInsights.find(e =>
      e.eventType === 'MicroFrontEndTiming' &&
      e['source.id'] === SOURCE_ID
    )
    expect(timingEvent).toBeDefined()

    // The DOMContentLoaded handler inserts a 200px spacer before existing content, causing a
    // measurable layout shift. The subsequent click finalizes CLS reporting via web-vitals.
    expect(timingEvent['nr.vitals.cls']).not.toBeNull()
    expect(typeof timingEvent['nr.vitals.cls']).toBe('number')
    expect(timingEvent['nr.vitals.cls']).toBeGreaterThan(0)
  })
})
