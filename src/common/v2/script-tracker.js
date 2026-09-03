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
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITimings} RegisterAPITimings
 * @typedef {import('../../loaders/api/register-api-types').RegisterAPITarget} RegisterAPITarget
 * @typedef {import('./script-tracker-types').RecordManifestScriptWindowFn} RecordManifestScriptWindowFn
 * @typedef {import('./script-tracker-types').TimingsInternals} TimingsInternals
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
 * Bookkeeping keyed by a `timings` object, kept off the object itself since it's exposed directly to customers via
 * `register().metadata.timings`.
 * @type {WeakMap<RegisterAPITimings, TimingsInternals>}
 */
const timingsInternals = new WeakMap()

/**
 * Gets (or lazily creates) the bookkeeping record for a `timings` object. A fresh record's `recordManifestScriptWindow`
 * defaults to widening `timings.scriptStart`/`scriptEnd` directly -- correct for a plain `timings` object never
 * produced by `findScriptTimings`. `findScriptTimings` overrides that default with one that folds into its live
 * getters instead.
 * @param {RegisterAPITimings} timings
 * @returns {TimingsInternals}
 */
function getOrCreateInternals (timings) {
  let internals = timingsInternals.get(timings)
  if (!internals) {
    internals = {
      weighedAssetUrls: new Set(),
      recordManifestScriptWindow: (start, end) => {
        if (start) timings.scriptStart = timings.scriptStart > 0 ? Math.min(timings.scriptStart, start) : start
        if (end) timings.scriptEnd = timings.scriptEnd > 0 ? Math.max(timings.scriptEnd, end) : end
      }
    }
    timingsInternals.set(timings, internals)
  }
  return internals
}

/**
 * Retrieves a script correlation by URL using exact matching. Exported so other features (e.g. generic_events'
 * resource attribution) can key off the same DOM node/load-timing tracking this module already does for every
 * `<script>` element, rather than setting up a second, redundant observer.
 * @param {string} targetUrl - The URL to find
 * @returns {ScriptCorrelation | undefined} - The correlation object if found
 */
export function findCorrelation (targetUrl) {
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
  // Tracked via an observer (not a later buffer read) because the performance buffer stops accepting new entries
  // once full, instead of dropping old ones -- a late register() call could otherwise miss timing entirely.
  const scriptObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      // Correlation bookkeeping only makes sense for script-like entries -- gated on validEntryCriteria so
      // scriptCorrelations doesn't grow for every image/css/font load on the page.
      if (validEntryCriteria(entry)) {
        const entryUrl = cleanURL(entry.name)
        const correlation = getOrCreateCorrelation(entryUrl)
        correlation.performance.start = Math.floor(entry.startTime)
        correlation.performance.end = Math.floor(entry.responseEnd)
        correlation.performance.value = entry
      }

      // Late-resolution subscribers can be for any asset type (not just scripts), so every entry is checked here,
      // unfiltered. Skipped when nothing is pending, the common case.
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
  // De-dupe by cleaned URL: a manifest can list the .register calling script itself as one of its own assets,
  // which would otherwise weigh the same resource twice (once via findScriptTimings, once via applyManifestTimings).
  const url = cleanURL(entry.name)
  const { weighedAssetUrls } = getOrCreateInternals(timings)
  if (weighedAssetUrls.has(url)) return
  weighedAssetUrls.add(url)

  // transferSize is 0 for cross-origin responses without Timing-Allow-Origin (a privacy restriction, not a
  // zero-byte asset) -- adding 0 is correct either way.
  timings.totalWeight = (timings.totalWeight || 0) + (entry.transferSize || 0)
  // 'blocking' always wins and never gets downgraded; 'non-blocking' only applies if nothing already resolved
  // true; no value at all (unsupported browser) leaves renderBlocking untouched (stays `undefined`).
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
 * Applies one manifest asset's performance entry to a timings object: weight/renderBlocking always accumulate;
 * fetchStart/fetchEnd and scriptStart/scriptEnd widen (never shrink) only when `timingMethod` calls for it; asset/
 * type get anchored to the first script asset seen to resolve.
 * @param {RegisterAPITimings} timings
 * @param {PerformanceResourceTiming} entry
 * @param {import('./manifest').ParsedManifestAsset} asset - the manifest asset this entry resolved
 * @param {{ resolved: boolean }} entryState - shared "first script asset wins" guard for a single `applyManifestTimings` call
 * @param {'entry'|'scripts'|'all'} [timingMethod] - the registered MFE's timing method; `undefined`/'entry' means weight/render-blocking still accumulate, but no timing widening happens at all
 */
function applyManifestEntry (timings, entry, asset, entryState, timingMethod) {
  // Weight isn't a timing concern, so it accumulates for every matched asset regardless of timingMethod.
  applyResourceWeight(timings, entry)

  if (timingMethod !== 'scripts' && timingMethod !== 'all') return // no timing-widening effect at the 'entry' default/unset

  const widensAllAssets = timingMethod === 'all'
  // Under 'scripts', only script assets widen the fetch window; under 'all', every matched asset does.
  if (widensAllAssets || asset.isScript) {
    const start = Math.floor(entry.startTime)
    const end = Math.floor(entry.responseEnd)
    // fetchStart/fetchEnd default to 0 ("not yet found") -- only fold into the min/max once they're positive,
    // or 0 would permanently win Math.min.
    timings.fetchStart = timings.fetchStart > 0 ? Math.min(timings.fetchStart, start) : start
    timings.fetchEnd = timings.fetchEnd > 0 ? Math.max(timings.fetchEnd, end) : end
  }

  // Non-script assets never execute, so only script assets widen the execution window or anchor asset/type.
  if (asset.isScript) {
    const correlation = findCorrelation(cleanURL(entry.name))
    if (correlation) {
      // Widens the aggregate scriptStart/scriptEnd window with this asset's current correlation timing. Re-called
      // as a 'load'/'error' listener below if its DOM completion hasn't fired yet, so a later, larger end still counts.
      const widenScriptWindowForAsset = () => {
        const { start: scriptStart, end: scriptEnd } = correlation.script
        getOrCreateInternals(timings).recordManifestScriptWindow(scriptStart, scriptEnd)
      }
      widenScriptWindowForAsset()
      if (!correlation.dom.end && correlation.dom.value) {
        ;['load', 'error'].forEach(eventType => correlation.dom.value.addEventListener(eventType, widenScriptWindowForAsset, { once: true }))
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
 * Subscribes to late resource timing emissions for manifest assets not yet resolved against the buffered entries.
 * Reuses the shared page-wide scriptObserver/poSubscribers mechanism (one PerformanceObserver for all MFEs, not
 * one per MFE) and, unlike that observer's own correlation bookkeeping, checks every resource entry -- not just
 * script-like ones -- so lazy-loaded images/fonts/stylesheets resolve too.
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
 * Applies a registered MFE's manifest to a timings object (already populated by `findScriptTimings`). No-op if no
 * manifest is present. Weight/renderBlocking always accumulate from every detected manifest asset; timing widening
 * (fetchStart/fetchEnd/scriptStart/scriptEnd/asset anchor) is opt-in via `timingMethod` -- see `applyManifestEntry`.
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
 * Uses the initiator function's stack to find script timing information via the resource timing API.
 * @param {RegisterAPITarget} [target] - the MFE target being registered; its id scopes stale-correlation
 * detection per-MFE rather than per-script-URL (see isCorrelationStale below)
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
    // remounting the same MFE without the script reloading) -- its dom/performance timings would then describe
    // the *original* load. Detect that so scriptStart/scriptEnd below can ignore the stale data.
    const correlation = timings.correlation
    const alreadyClaimedByThisMFE = !!mfeId && !!correlation?.claimedBy.has(mfeId)
    if (correlation && mfeId) correlation.claimedBy.add(mfeId)
    const isCorrelationStale = () => {
      const correlationStart = correlation?.script.start
      if (!alreadyClaimedByThisMFE || !correlationStart) return false
      const staleness = timings.registeredAt - correlationStart
      return staleness > CORRELATION_STALE_THRESHOLD_MS
    }

    // Only reached for a real (non-inline), stack-attributable script -- scriptStart/scriptEnd become live getters
    // below, so manifest widening needs a hook that composes with them instead of overriding them (see
    // recordManifestScriptWindow's doc comment). Every other path keeps getOrCreateInternals' plain-value-widening
    // default, which is already correct there.
    let manifestScriptStart = 0
    let manifestScriptEnd = 0
    /**
     * Widens the running manifestScriptStart/manifestScriptEnd accumulators with one asset's correlation timing.
     * Never shrinks either bound; a falsy (unresolved) start/end is ignored.
     * @type {RecordManifestScriptWindowFn}
     */
    getOrCreateInternals(timings).recordManifestScriptWindow = (start, end) => {
      if (start) manifestScriptStart = manifestScriptStart > 0 ? Math.min(manifestScriptStart, start) : start
      if (end) manifestScriptEnd = manifestScriptEnd > 0 ? Math.max(manifestScriptEnd, end) : end
    }

    // Getters, since correlation data may still arrive after this function returns -- we want the freshest value
    // at harvest time. Non-stale: fall back to fetchEnd (best approximation) if correlation isn't available yet.
    // Stale: fall back to registeredAt, since fetchEnd would derive from the same stale correlation. Manifest
    // widening is re-read on every access rather than baked in once, so it composes with a correlation that
    // resolves later.
    Object.defineProperty(
      timings,
      'scriptStart',
      timingFactory(() => {
        const ownStart = isCorrelationStale() ? timings.registeredAt : (correlation?.script.start ?? timings.fetchEnd)
        return manifestScriptStart > 0 ? Math.min(ownStart, manifestScriptStart) : ownStart
      })
    )
    Object.defineProperty(
      timings,
      'scriptEnd',
      timingFactory(() => {
        const ownEnd = isCorrelationStale() ? timings.registeredAt : (correlation?.script.end ?? timings.registeredAt)
        return manifestScriptEnd > 0 ? Math.max(ownEnd, manifestScriptEnd) : ownEnd
      })
    )
  } catch (error) {
    // Don't let stack parsing errors break anything
  }

  return timings
}
