/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanURL } from '../url/clean-url'

/**
 * @typedef {import('../../loaders/api/register-api-types').AssetFile} AssetFile
 */

/**
 * @typedef {Object} ParsedManifestAsset
 * @property {string|RegExp} pattern - the original path/RegExp supplied by the customer
 * @property {(url: string) => boolean} test - precompiled matcher against a resolved URL
 * @property {boolean} entryPoint
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
 * @param {{assets?: Array<AssetFile|RegExp|string>}} [rawManifest]
 * @returns {ParsedManifest|undefined} undefined if no usable assets were supplied, so callers can cheaply skip all manifest logic
 */
export function parseManifest (rawManifest) {
  if (!Array.isArray(rawManifest?.assets) || !rawManifest.assets.length) return undefined

  const assets = rawManifest.assets.map(parseAsset).filter(Boolean)
  if (!assets.length) return undefined

  return { assets, scripts: assets.filter(asset => asset.isScript) }
}

/**
 * @param {AssetFile|RegExp|string} entry
 * @returns {ParsedManifestAsset|undefined}
 */
function parseAsset (entry) {
  if (entry instanceof RegExp) {
    return { pattern: entry, test: (url) => entry.test(cleanURL(url)), entryPoint: false, isScript: false }
  }

  if (typeof entry === 'string') {
    return { pattern: entry, test: (url) => cleanURL(url).includes(entry), entryPoint: false, isScript: isScriptPath(entry) }
  }

  if (entry && typeof entry === 'object' && typeof entry.path === 'string') {
    const isScript = entry.type ? isScriptType(entry.type) : isScriptPath(entry.path)
    return { pattern: entry.path, test: (url) => cleanURL(url).includes(entry.path), entryPoint: !!entry.entryPoint, isScript }
  }

  return undefined
}

function isScriptPath (path) {
  return path.endsWith('.js')
}

function isScriptType (type) {
  return type === 'js' || type === 'script'
}

/**
 * Returns the manifest asset flagged as the MFE's entry point, if any. If more than one asset is flagged, the first
 * one (in supplied order) wins.
 * @param {ParsedManifest} [parsed]
 * @returns {ParsedManifestAsset|undefined}
 */
export function getEntryAsset (parsed) {
  return parsed?.assets.find(asset => asset.entryPoint)
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
