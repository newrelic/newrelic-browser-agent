/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanURL } from '../url/clean-url'

/**
 * @typedef {Object} AssetFile
 * @property {string|RegExp} matcher - the path/path-fragment string, or RegExp, used to match a resolved URL against this asset
 * @property {'script'} [type] - optional override for script-capability inference. When omitted, script-capability is inferred from a `.js`
 * suffix on a string `matcher` (a RegExp `matcher` is never inferred as a script). Supply `type: 'script'` to explicitly flag an entry as a
 * script regardless of its matcher shape/suffix (e.g. an extensionless URL, or a RegExp targeting a script path).
 */

/**
 * @typedef {Object} ParsedManifestAsset
 * @property {string|RegExp} pattern - the original matcher supplied by the customer
 * @property {(url: string) => boolean} test - precompiled matcher against a resolved URL
 * @property {boolean} isScript
 */

/**
 * @typedef {Object} ParsedManifest
 * @property {ParsedManifestAsset[]} assets - all supplied assets
 * @property {ParsedManifestAsset[]} scripts - the subset of assets inferred/declared as scripts (`.js`)
 */

/**
 * Parses a raw manifest supplied to `register()` into precompiled matcher closures. Parsing happens once, at
 * registration time, so downstream event attribution (which runs on every ajax/error/log/websocket event) never has
 * to re-derive matching logic from the raw customer input.
 * @param {{assets?: Array<AssetFile>}} [rawManifest]
 * @returns {ParsedManifest|undefined} undefined if no usable assets were supplied, so callers can cheaply skip all manifest logic
 */
export function parseManifest (rawManifest) {
  if (!Array.isArray(rawManifest?.assets) || !rawManifest.assets.length) return undefined

  const assets = rawManifest.assets.map(parseAsset).filter(Boolean)
  if (!assets.length) return undefined

  return { assets, scripts: assets.filter(asset => asset.isScript) }
}

/**
 * @param {AssetFile} entry
 * @returns {ParsedManifestAsset|undefined}
 */
function parseAsset (entry) {
  if (!entry || typeof entry !== 'object') return undefined

  const { matcher, type } = entry
  const isScript = type !== undefined ? isScriptType(type) : (typeof matcher === 'string' && isScriptPath(matcher))

  if (isRegExp(matcher)) {
    return { pattern: matcher, test: (url) => matcher.test(cleanURL(url)), isScript }
  }

  if (typeof matcher === 'string') {
    return { pattern: matcher, test: (url) => cleanURL(url).includes(matcher), isScript }
  }

  return undefined
}

function isScriptPath (path) {
  return path.endsWith('.js')
}

/**
 * Cross-realm-safe check for whether a value is a RegExp. `instanceof RegExp` only returns true when the value's
 * prototype chain links to THIS realm's `RegExp.prototype` -- a regex literal constructed in a different realm
 * (an iframe, a Worker via structured clone, a WebDriver sandbox such as Firefox's geckodriver executeScript
 * context) is still a genuine RegExp, just not an instance of this realm's constructor, and would otherwise be
 * silently dropped by parseAsset below.
 * @param {*} value
 * @returns {boolean}
 */
function isRegExp (value) {
  return Object.prototype.toString.call(value) === '[object RegExp]'
}

function isScriptType (type) {
  return type === 'script'
}

/**
 * Determines whether a resolved URL matches any asset in a parsed manifest.
 * @param {ParsedManifest|undefined} parsed
 * @param {string} url
 * @param {{scriptsOnly?: boolean}} [options]
 * @returns {boolean}
 */
export function matchManifestAsset (parsed, url, { scriptsOnly = false } = {}) {
  if (!parsed || !url) return false
  const candidates = scriptsOnly ? parsed.scripts : parsed.assets
  return candidates.some(asset => asset.test(url))
}
