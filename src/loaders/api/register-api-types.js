/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} RegisterAPI
 * @property {(name: string, attributes?: object) => void} addPageAction - Add a page action for the registered entity.
 * @property {(message: string, options?: { customAttributes?: object, level?: 'ERROR' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN'}) => void} log - Capture a log for the registered entity.
 * @property {(error: Error | string, customAttributes?: object) => void} noticeError - Notice an error for the registered entity.
 * @property {() => void} deregister - Deregister the registered entity, which blocks its use and captures end of life timings.
 * @property {(eventType: string, attributes?: Object) => void} recordCustomEvent - Record a custom event for the registered entity.
 * @property {(eventType: string, options?: {start?: number|PerformanceMark, end?: number|PerformanceMark, customAttributes?: object}) => ({start: number, end: number, duration: number, customAttributes: object})} measure - Measures a task that is recorded as a BrowserPerformance event.
 * @property {(value: string | null) => void} setApplicationVersion - Add an application.version attribute to all outgoing data for the registered entity.
 * @property {(name: string, value: string | number | boolean | null, persist?: boolean) => void} setCustomAttribute - Add a custom attribute to outgoing data for the registered entity.
 * @property {(value: string | null, resetSession?: boolean) => void} setUserId - Add an enduser.id attribute to all outgoing API data for the registered entity.  Note: a registered entity will not be able to initiate a session reset.  It must be done from the main agent.
 * @property {RegisterAPIMetadata} metadata - The metadata object containing the custom attributes and target information for the registered entity.
 */

/**
 * @typedef {Object} AssetFile
 * @property {string} path - A path or path fragment identifying the asset (matched as a substring against resolved resource URLs).
 * @property {string} [type] - The asset type (e.g. 'js', 'css'). If omitted, inferred from the `.js` extension of `path`.
 */

/**
 * @typedef {Object} RegisterAPIConstructor
 * @property {string} id - The unique id for the registered entity. This will be assigned to any synthesized entities.
 * @property {string} name - The readable name for the registered entity. This will be assigned to any synthesized entities.
 * @property {{[key: string]: any}} [tags] - The tags for the registered entity as key-value pairs. This will be assigned to any synthesized entities. Tags are converted to source.* attributes (e.g., {environment: 'production'} becomes source.environment: 'production').
 * @property {RegisterAPITarget} [parent] - The parent target for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {string} [parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {{assets?: Array<AssetFile|RegExp|string>}} [manifest] - An optional manifest describing the MFE's known assets (scripts, stylesheets, images, fonts, etc.), used to improve the accuracy of event attribution (errors, logs, ajax, websockets), attribute `BrowserPerformance` resource events (any asset type, not just scripts) and, depending on `timingMethod`, MicroFrontEndTiming values. If omitted, the agent falls back to its existing behavior of only evaluating the script that called `register()` (resource attribution still applies to that script).
 * @property {'entry'|'scripts'|'all'} [timingMethod] - Controls which manifest assets are used to calculate MicroFrontEndTiming values: 'entry' (the default) leaves timing based entirely on the script that called `register()`, unaffected by the manifest; 'scripts' widens the timing window across all script assets; 'all' widens it across every asset.
 */

/**
 * @typedef {Object} RegisterAPIMetadata
 * @property {Object} customAttributes - The custom attributes for the registered entity.
 * @property {Partial<RegisterAPITimings>} timings - The timing metrics for the registered entity.
 * @property {Partial<RegisterAPITarget>} target - The options for the registered entity.
 */

/**
 * @typedef {Object} RegisterAPITarget
 * @property {string} id - The ID for the registered entity.
 * @property {string} name - The name returned for the registered entity.
 * @property {{[key: string]: any}} [tags] - The tags for the registered entity as key-value pairs.
 * @property {string} [parentId] - The parentId for the registered entity. If none was supplied, it will assume the entity guid from the main agent.
 * @property {import('../../common/v2/manifest').ParsedManifest} [manifest] - The parsed manifest for the registered entity, if one was supplied.
 * @property {'entry'|'scripts'|'all'} [timingMethod] - The timing method supplied for the registered entity, if any.
 */

/**
 * @typedef {Object} RegisterAPITimings
 * @property {number} registeredAt - The timestamp when the registered entity was created.
 * @property {number} [reportedAt] - The timestamp when the registered entity was deregistered.
 * @property {number} fetchStart - The timestamp when the registered entity began fetching (performance.start). When a manifest with timingMethod 'scripts'|'all' is supplied, this widens to the earliest fetchStart across all matched manifest assets.
 * @property {number} fetchEnd - The timestamp when the registered entity finished fetching (performance.end). When a manifest with timingMethod 'scripts'|'all' is supplied, this widens to the latest fetchEnd across all matched manifest assets.
 * @property {number} scriptStart - The timestamp when script initialization began (max of dom.start or performance.end, or performance.end if no dom.start). When a manifest with timingMethod 'scripts'|'all' is supplied, this widens to the earliest scriptStart across all matched manifest script assets (non-script assets are excluded).
 * @property {number} scriptEnd - The timestamp when script loading completed (dom.end or registeredAt if no dom.end). When a manifest with timingMethod 'scripts'|'all' is supplied, this widens to the latest scriptEnd across all matched manifest script assets (non-script assets are excluded).
 * @property {Object} [asset] - The asset path (if found) for the registered entity.
 * @property {string} type - The type of timing associated with the registered entity, 'script' or 'link' if found with the performance resource API, 'fetch' for dynamic imports, 'inline' if found to be associated with the root document URL, or 'unknown' if no associated resource could be found.
 * @property {number} totalWeight - The sum of `transferSize` (bytes) across every asset detected for the registered entity -- the entry script, plus, when a manifest with timingMethod 'scripts'|'all' is supplied, every matched manifest asset. Cross-origin assets without a Timing-Allow-Origin header report 0 bytes per the Resource Timing spec.
 * @property {boolean} [renderBlocking] - True if any detected asset (entry script or matched manifest asset) has a `renderBlockingStatus` of 'blocking'; false if none were 'blocking' but at least one reported 'non-blocking'; left `undefined` if no detected asset reported the attribute at all (e.g. unsupported browser). A single 'blocking' asset always wins over any number of 'non-blocking' ones, regardless of resolution order.
 */

/**
 * @typedef {Object} RegisterAPIVitals
 * @property {number} [fcp] - The first contentful paint timing for the registered entity.
 * @property {number} [lcp] - The largest contentful paint timing for the registered entity.
 * @property {number} [cls] - The cumulative layout shift score for the registered entity.
 * @property {number} [inp] - The interaction to next paint timing for the registered entity.
 */

export default {}
