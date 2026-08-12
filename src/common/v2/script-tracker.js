/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { globalScope } from '../constants/runtime'
import { now } from '../timing/now'
import { cleanURL } from '../url/clean-url'
import { chrome, chromeEval, gecko } from '../util/browser-stack-matchers'
import { ScriptCorrelation } from './script-correlation'
import { CORRELATION_STALE_THRESHOLD_MS } from './script-tracker-constants'
import { timingFactory } from './timing-factory'

/**
 * @typedef {import('./register-api-types').RegisterAPITimings} RegisterAPITimings
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITarget} RegisterAPITarget
 */

/** export for testing purposes */
export let thisFile
try {
  thisFile = extractUrlsFromStack(getDeepStackTrace())[0]
} catch (err) {
  thisFile = extractUrlsFromStack(err)[0]
}

/** @type {(entry: PerformanceEntry) => boolean} - A shared function to determine if a performance entry is a valid script or link resource for evaluation */
const validEntryCriteria = entry => entry.initiatorType === 'script' || (['link', 'fetch'].includes(entry.initiatorType) && cleanURL(entry.name).endsWith('.js'))

/** @type {Map<string, ScriptCorrelation>} - Central registry for script correlations containing both DOM and Performance data */
export const scriptCorrelations = new Map()
/** @type {Array<{ test: (entry: PerformanceEntry) => boolean, addedAt: number }>} an array of PerformanceObserver subscribers to check for late emissions */
let poSubscribers = []

/**
 * Retrieves a script correlation by URL using exact matching
 * @param {string} targetUrl - The URL to find
 * @returns {ScriptCorrelation | undefined} - The correlation object if found
 */
function findCorrelation (targetUrl) {
  return scriptCorrelations.get(targetUrl)
}

/**
 * Gets or creates a script correlation entry
 * @param {string} url - The cleaned URL
 * @returns {ScriptCorrelation} - The correlation object
 */
function getOrCreateCorrelation (url) {
  const existing = findCorrelation(url)
  if (existing) return existing

  const correlation = new ScriptCorrelation(url)
  scriptCorrelations.set(url, correlation)

  // Keep size under control
  if (scriptCorrelations.size > 1000) {
    const firstKey = scriptCorrelations.keys().next().value
    scriptCorrelations.delete(firstKey)
  }

  return correlation
}

/** Set up a MutationObserver to detect script elements being added to the DOM */
if (globalScope.MutationObserver && globalScope.document) {
  const scriptMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT' && node.src) {
          const cleanedSrc = cleanURL(node.src)
          const correlation = getOrCreateCorrelation(cleanedSrc)

          correlation.dom.start = now()
          correlation.dom.value = node

          const setEnd = () => { correlation.dom.end = now() }
          ;['load', 'error'].forEach(event => node.addEventListener(event, setEnd, { once: true }))
        }
      })
    })
  })

  scriptMutationObserver.observe(globalScope.document, {
    childList: true,
    subtree: true
  })
}

if (globalScope.PerformanceObserver?.supportedEntryTypes.includes('resource')) {
  /** We must track the script assets this way, because the performance buffer can fill up and when it does that
   * it stops accepting new entries (instead of dropping old entries), which means if the register API is called
   * after the buffer fills up we won't be able to get the script timing information from the resource timing API
  */
  const scriptObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      // DOM/script correlation bookkeeping only makes sense for script-like entries (it's later read via
      // ScriptCorrelation.script, which is anchored to <script> tag DOM timing) -- stays gated on
      // validEntryCriteria to avoid growing scriptCorrelations for every image/css/font load on the page.
      if (validEntryCriteria(entry)) {
        const entryUrl = cleanURL(entry.name)
        const correlation = getOrCreateCorrelation(entryUrl)
        correlation.performance.start = Math.floor(entry.startTime)
        correlation.performance.end = Math.floor(entry.responseEnd)
        correlation.performance.value = entry
      }

      // Late-resolution subscribers (findScriptTimings' entry-script subscriber, or a manifest asset's) can be for
      // any asset type -- images/fonts/stylesheets lazy-loaded after register() need to resolve too, not just
      // scripts -- so every entry is checked here, unfiltered. Skipped when nothing is pending, the common case.
      if (!poSubscribers.length) return

      const canClear = []
      poSubscribers.forEach(({ test, addedAt }, idx) => {
        if (test(entry) || now() - addedAt > 10000) canClear.push(idx)
      })
      poSubscribers = poSubscribers.filter((_, idx) => !canClear.includes(idx))
    })
  })
  scriptObserver.observe({ type: 'resource', buffered: true })
}

/**
 * Extracts URLs from stack traces using the same logic as compute-stack-trace.js
 * @param {string} stack The error stack trace
 * @returns {string[]} Array of cleaned URLs found in the stack trace
 */
export function extractUrlsFromStack (stack) {
  if (!stack || typeof stack !== 'string') return []

  const urls = new Set()
  const lines = stack.split('\n')

  for (const line of lines) {
    // Try gecko format first, then chrome
    const parts = line.match(gecko) || line.match(chrome) || line.match(chromeEval)
    if (parts && parts[2]) {
      urls.add(cleanURL(parts[2]))
    } else {
      // Fallback: match URLs using a generic .js pattern (non-greedy to handle ports and query params)
      const fallbackMatch = line.match(/\(([^)]+\.js):\d+:\d+\)/) || line.match(/^\s+at\s+([^\s(]+\.js):\d+:\d+/)
      if (fallbackMatch && fallbackMatch[1]) {
        urls.add(cleanURL(fallbackMatch[1]))
      }
    }
  }
  return [...urls]
}

/**
 * Returns a deep stack trace by temporarily increasing the stack trace limit.
 * @returns {Error.stack | undefined}
 */
export function getDeepStackTrace () {
  let stack
  try {
    const originalStackLimit = Error.stackTraceLimit
    Error.stackTraceLimit = 50
    stack = new Error().stack
    Error.stackTraceLimit = originalStackLimit
  } catch (e) {
    stack = new Error().stack
  }
  return stack
}

/**
 * Indicates whether the provided URL matches any script preload link tags in the document.
 * @param {string} targetUrl The URL to match against preload tags
 * @returns {boolean} True if a matching preload link is found, false otherwise
 */
function wasPreloaded (targetUrl) {
  if (!targetUrl || !globalScope.document) return false

  try {
    const linkTags = globalScope.document.querySelectorAll('link[rel="preload"][as="script"]')
    for (const link of linkTags) {
      // link.href is resolved to an absolute URL by the browser (even if supplied as relative), so we can match exactly against the cleaned target URL
      if (cleanURL(link.href) === targetUrl) return true
    }
  } catch (error) {
    // Don't let DOM parsing errors break anything
  }
  return false
}

/**
 * Checks if a performance entry matches the target MFE script URL using exact matching
 * @param {PerformanceResourceTiming} entry - The resource timing entry
 * @param {string} targetUrl - The MFE script URL to match
 * @returns {boolean} True if the entry matches
 */
function entryMatchesUrl (entry, targetUrl) {
  const entryUrl = cleanURL(entry.name)
  return entryUrl === targetUrl
}

/**
 * Applies performance entry timing data to a timings object
 * @param {RegisterAPITimings} timings - The timings object to update
 * @param {PerformanceResourceTiming} entry - The performance entry
 */
function applyPerformanceEntry (timings, entry) {
  timings.fetchStart = Math.floor(entry.startTime)
  timings.fetchEnd = Math.floor(entry.responseEnd)
  timings.asset = entry.name
  timings.type = entry.initiatorType
  applyResourceWeight(timings, entry)
}

/**
 * Accumulates the byte weight and render-blocking status of a single detected asset (the entry script or a resolved
 * manifest asset) into a timings object. Shared by both the entry-script path (`applyPerformanceEntry`) and the
 * manifest path (`applyManifestEntry`) so `totalWeight`/`renderBlocking` reflect every asset actually detected,
 * regardless of which path found it.
 * @param {RegisterAPITimings} timings
 * @param {PerformanceResourceTiming} entry
 */
function applyResourceWeight (timings, entry) {
  // transferSize is 0 for cross-origin responses without a Timing-Allow-Origin header (a browser privacy
  // restriction, not evidence of a zero-byte asset) -- adding 0 is the correct behavior either way.
  timings.totalWeight = (timings.totalWeight || 0) + (entry.transferSize || 0)
  // renderBlocking maps directly to the browser's own renderBlockingStatus value: 'blocking' -> true (and, once
  // true across any detected asset, it never gets downgraded by a later non-blocking one), 'non-blocking' -> false
  // (only if nothing has already resolved true), and no value at all (browser doesn't support the attribute for
  // this asset) leaves it untouched -- so it stays `undefined` if no detected asset ever reports the attribute.
  if (entry.renderBlockingStatus === 'blocking') timings.renderBlocking = true
  else if (entry.renderBlockingStatus === 'non-blocking' && timings.renderBlocking !== true) timings.renderBlocking = false
}

/**
 * Subscribes to late resource timing emissions for a script URL.
 * @param {RegisterAPITimings} timings - The timings object to update
 * @param {string} mfeScriptUrl - The script URL to match
 */
function subscribeToLatePerformanceEntry (timings, mfeScriptUrl) {
  if (!globalScope.PerformanceObserver?.supportedEntryTypes?.includes('resource')) return

  poSubscribers.push({
    addedAt: now(),
    test: (entry) => {
      if (entryMatchesUrl(entry, mfeScriptUrl)) {
        applyPerformanceEntry(timings, entry)
        return true
      }
      return false
    }
  })
}

/**
 * Applies a single manifest asset's performance entry to a timings object: always accumulates totalWeight/
 * renderBlocking (these aren't timing concerns, so unlike everything else here they're never gated behind
 * `timingMethod`), then, only when `timingMethod` calls for it, widens the aggregate fetchStart/fetchEnd window
 * (never shrinking it), widens the aggregate scriptStart/scriptEnd window for script assets using their DOM
 * correlation data, and anchors asset/type on this entry if it's the first script asset seen to resolve.
 * @param {RegisterAPITimings} timings
 * @param {PerformanceResourceTiming} entry
 * @param {import('./manifest').ParsedManifestAsset} asset - the manifest asset this entry resolved
 * @param {{ resolved: boolean }} entryState - shared "first script asset wins" guard for a single `applyManifestTimings` call
 * @param {'entry'|'scripts'|'all'} [timingMethod] - the registered MFE's timing method; `undefined`/'entry' means weight/render-blocking still accumulate, but no timing widening happens at all
 */
function applyManifestEntry (timings, entry, asset, entryState, timingMethod) {
  // Weight/render-blocking accumulate for every matched asset regardless of type or timingMethod -- css/images/
  // fonts have byte weight and can be render-blocking too, and "how much did this MFE actually weigh" isn't a
  // timing question, so it shouldn't be gated behind the opt-in timingMethod values below.
  applyResourceWeight(timings, entry)

  if (timingMethod !== 'scripts' && timingMethod !== 'all') return // no timing-widening effect at the 'entry' default/unset

  const widensAllAssets = timingMethod === 'all'
  // Under 'scripts', only script assets widen the fetch window (matching pre-existing behavior); under 'all',
  // every matched asset does.
  if (widensAllAssets || asset.isScript) {
    const start = Math.floor(entry.startTime)
    const end = Math.floor(entry.responseEnd)
    // fetchStart/fetchEnd default to 0 (meaning "not yet found") elsewhere in this module, so only fold them into
    // the min/max aggregation once they hold a real, positive value -- otherwise the 0 default would permanently
    // win Math.min.
    timings.fetchStart = timings.fetchStart > 0 ? Math.min(timings.fetchStart, start) : start
    timings.fetchEnd = timings.fetchEnd > 0 ? Math.max(timings.fetchEnd, end) : end
  }

  // Non-script assets (css/images/fonts) never execute, so only script assets widen the execution window or anchor asset/type.
  if (asset.isScript) {
    const correlation = findCorrelation(cleanURL(entry.name))
    if (correlation) {
      const widenScriptWindow = () => {
        const { start: scriptStart, end: scriptEnd } = correlation.script
        if (scriptStart) timings.scriptStart = timings.scriptStart > 0 ? Math.min(timings.scriptStart, scriptStart) : scriptStart
        if (scriptEnd) timings.scriptEnd = timings.scriptEnd > 0 ? Math.max(timings.scriptEnd, scriptEnd) : scriptEnd
      }
      widenScriptWindow()
      // A script's PerformanceResourceTiming (keyed on responseEnd, network completion only) can resolve before
      // its DOM load/error event (which sets correlation.dom.end, after parse/execution) -- if that hasn't
      // fired yet, re-widen once it does instead of permanently snapshotting a collapsed scriptStart===scriptEnd.
      if (!correlation.dom.end && correlation.dom.value) {
        ;['load', 'error'].forEach(eventType => correlation.dom.value.addEventListener(eventType, widenScriptWindow, { once: true }))
      }
    }

    if (!entryState.resolved) {
      timings.asset = entry.name
      timings.type = entry.initiatorType
      entryState.resolved = true
    }
  }
}

/**
 * Subscribes to late resource timing emissions for any manifest assets that were not already resolved against the
 * buffered performance entries. Reuses the shared page-wide scriptObserver/poSubscribers mechanism (rather than
 * creating a new PerformanceObserver per registered MFE) so this scales with the number of MFEs on a page. Unlike
 * the correlation bookkeeping in the observer above (which only looks at script-like entries via
 * validEntryCriteria), this late-resolution pass runs against every resource entry, so images/fonts/stylesheets
 * lazy-loaded after `register()` resolve correctly too, not just script-type manifest assets.
 * @param {RegisterAPITimings} timings
 * @param {Set<import('./manifest').ParsedManifestAsset>} pending - manifest assets still unresolved
 * @param {{ resolved: boolean }} entryState - shared "first script asset wins" guard for a single `applyManifestTimings` call
 * @param {'entry'|'scripts'|'all'} [timingMethod] - forwarded to `applyManifestEntry` for each late-resolving asset
 */
function subscribeToLateManifestEntries (timings, pending, entryState, timingMethod) {
  if (!globalScope.PerformanceObserver?.supportedEntryTypes?.includes('resource')) return

  poSubscribers.push({
    addedAt: now(),
    test: (entry) => {
      const matched = [...pending].find(asset => asset.test(entry.name))
      if (matched) {
        applyManifestEntry(timings, entry, matched, entryState, timingMethod)
        pending.delete(matched)
      }
      return pending.size === 0
    }
  })
}

/**
 * Applies a registered MFE's manifest to a timings object (already populated by `findScriptTimings`). No-ops
 * entirely when no manifest is present. `totalWeight`/`renderBlocking` accumulate from every manifest asset
 * detected regardless of `timingMethod` -- weight isn't a timing concept, so even the 'entry' default (or
 * `timingMethod` left unset) still reflects manifest assets' bytes. Actual timing widening (fetchStart/fetchEnd/
 * scriptStart/scriptEnd/asset anchor) stays opt-in: it only happens when `timingMethod` is 'scripts' or 'all', and
 * only scriptStart/scriptEnd/the asset anchor are restricted to script assets even in 'all' mode (non-script
 * assets never execute). Whichever script asset is seen to resolve first (across both the immediate
 * buffered-entries pass and any later-resolving entries) anchors asset/type -- manifests with no script assets, or
 * a `timingMethod` that doesn't request widening, leave asset/type as whatever `findScriptTimings` derived from
 * the caller script.
 * @param {RegisterAPITimings} timings - the timings object to widen in place
 * @param {RegisterAPITarget} target - the registered MFE target, which may carry a parsed `manifest`
 */
export function applyManifestTimings (timings, target) {
  const parsedManifest = target?.manifest
  if (!parsedManifest || !parsedManifest.assets.length) return

  const entryState = { resolved: false }
  const pending = new Set(parsedManifest.assets)

  const resourceEntries = globalScope.performance?.getEntriesByType('resource') || []
  resourceEntries.forEach((entry) => {
    const matched = [...pending].find(asset => asset.test(entry.name))
    if (matched) {
      applyManifestEntry(timings, entry, matched, entryState, target.timingMethod)
      pending.delete(matched)
    }
  })

  if (pending.size) subscribeToLateManifestEntries(timings, pending, entryState, target.timingMethod)
}

/**
 * Uses the stack of the initiator function, returns script timing information if a script can be found with the resource timing API matching the URL found in the stack.
 * @param {RegisterAPITarget} [target] - The MFE target being registered. Its id is used to scope stale-correlation detection per-MFE rather than per-script-URL, so one script registering multiple distinct MFEs doesn't misclassify a later MFE's registration as a stale reuse of an earlier one's.
 * @returns {RegisterAPITimings} Object containing script fetch start and end times, and the asset URL if found
 */
export function findScriptTimings (target) {
  const mfeId = target?.id
  const timings = { registeredAt: now(), reportedAt: undefined, fetchStart: 0, fetchEnd: 0, scriptStart: 0, scriptEnd: 0, asset: undefined, type: 'unknown', totalWeight: 0, renderBlocking: undefined }
  const stack = getDeepStackTrace()
  if (!stack) return timings

  const navUrl = globalScope.performance?.getEntriesByType('navigation')?.[0]?.name || ''

  try {
    const urls = extractUrlsFromStack(stack)
    // Filter out agent file from URLs (unless it's the only one)
    const mfeScriptUrl = (urls.length > 1 ? urls.filter(line => thisFile !== line) : urls)[0]
    if (!mfeScriptUrl) return timings

    // Check for inline script
    if (navUrl.includes(mfeScriptUrl)) {
      timings.asset = cleanURL(navUrl)
      timings.type = 'inline'
      return timings
    }

    // Get correlation data
    timings.correlation = findCorrelation(mfeScriptUrl)

    // Use correlation's performance entry if available, otherwise check the live performance API before falling back to the buffered observer.
    const performanceEntry = timings.correlation?.performance.value || globalScope.performance?.getEntriesByType('resource')?.find(e => entryMatchesUrl(e, mfeScriptUrl))

    if (performanceEntry) {
      applyPerformanceEntry(timings, performanceEntry)
    } else {
      const isPreloaded = wasPreloaded(mfeScriptUrl)

      // Handle preloaded scripts and any late resource emissions through the shared buffered observer.
      if (isPreloaded) {
        timings.asset = mfeScriptUrl
        timings.type = 'preload'
      }

      subscribeToLatePerformanceEntry(timings, mfeScriptUrl)
    }

    // A correlation can be reused across multiple `register()` calls for the same script URL (e.g. an SPA
    // remounting the same MFE without the script actually reloading). When that happens, its dom/performance
    // timings still describe the *original* load, not this one. Detect that case so scriptStart/scriptEnd
    // below can ignore the stale data instead of reporting it as if it were fresh.
    const correlation = timings.correlation
    const alreadyClaimedByThisMFE = !!mfeId && !!correlation?.claimedBy.has(mfeId)
    if (correlation && mfeId) correlation.claimedBy.add(mfeId)
    const isCorrelationStale = () => {
      const correlationStart = correlation?.script.start
      if (!alreadyClaimedByThisMFE || !correlationStart) return false
      const staleness = timings.registeredAt - correlationStart
      return staleness > CORRELATION_STALE_THRESHOLD_MS
    }

    // Use getters here because the correlation data may arrive after this function returns the timing object, and we want to provide the most up-to-date timing information possible when the getters are accessed at harvest time.
    // Non-stale: fall back to fetchEnd if correlation data isn't available yet (our best approximation for script execution start). Stale: fall back straight to registeredAt — fetchEnd would be derived from the same stale correlation, so it can't be trusted either.
    Object.defineProperty(
      timings,
      'scriptStart',
      timingFactory(() => isCorrelationStale() ? timings.registeredAt : (correlation?.script.start ?? timings.fetchEnd))
    )
    Object.defineProperty(
      timings,
      'scriptEnd',
      timingFactory(() => isCorrelationStale() ? timings.registeredAt : (correlation?.script.end ?? timings.registeredAt))
    )
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
