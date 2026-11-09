import { createHash } from 'crypto'
import { readFile } from 'fs/promises'

/**
 * Computes the SRI-format (sha384) digest of some content.
 * @param {Buffer|ArrayBuffer|string} contents
 * @returns {string} Digest formatted as `sha384-<base64>`.
 */
export function sha384 (contents) {
  const data = contents instanceof ArrayBuffer ? Buffer.from(contents) : contents
  return `sha384-${createHash('sha384').update(data).digest('base64')}`
}

/**
 * Reads an integrity manifest produced by .github/scripts/generate-integrity-manifest.mjs.
 * @param {string} manifestPath
 * @returns {Promise<{files: Record<string, {sha384: string}>}>}
 */
export async function loadManifest (manifestPath) {
  return JSON.parse(await readFile(manifestPath, 'utf-8'))
}

/**
 * Checks that content matches the manifest entry for an asset. A missing entry is treated as a mismatch.
 * @param {{files: Record<string, {sha384: string}>}} manifest
 * @param {string} assetPath File path as it appears in the manifest (the CDN key).
 * @param {Buffer|ArrayBuffer|string} contents Content actually served or about to be published.
 * @returns {boolean} true when the digest matches the manifest.
 */
export function matchesManifest (manifest, assetPath, contents) {
  const expected = manifest.files?.[assetPath]?.sha384
  return !!expected && expected === sha384(contents)
}

/*
 * The entry-point loaders customers actually load: nr-loader-<type>-<version>.min.js (and the older nr-<type>-<version>.min.js
 * naming), with or without the polyfills variant. The unminified builds, sourcemaps, licenses and aggregate chunks are not matched.
 */
const MINIFIED_LOADER_PATTERN = /^nr-(loader-)?(rum|full|spa)(-polyfills)?-\d[\d.]*\.min\.js$/

/**
 * Whether a manifest key is a minified entry-point loader.
 * @param {string} key File path as it appears in the manifest (the CDN key).
 * @returns {boolean}
 */
export function isMinifiedLoader (key) {
  return MINIFIED_LOADER_PATTERN.test(key)
}

/**
 * @typedef {Object} PlannedRelease
 * @property {string} version Release version without the leading v.
 * @property {{files: Record<string, {sha384: string}>}} manifest The release's integrity manifest.
 * @property {'full'|'loaders'} tier `full` checks every .js file; `loaders` checks only the minified entry-point loaders.
 * @property {string[]} keys Manifest keys that will be downloaded and compared.
 */

/**
 * Decides which files of each release to check. The newest releases are checked in full, because they are the ones
 * being served right now, aggregate chunks included. Every older release is checked for its minified loaders only,
 * which keeps a sweep of the whole release history small enough to run every few minutes.
 * @param {Array<{version: string, manifest: {files: Record<string, {sha384: string}>}}>} releases Newest first.
 * @param {number} fullCount How many of the newest releases get the full check.
 * @param {string} [include] Only keys containing this text are kept. Matched literally, not as a pattern.
 * @returns {PlannedRelease[]}
 */
export function planChecks (releases, fullCount, include = '') {
  return releases.map((release, index) => {
    const tier = index < fullCount ? 'full' : 'loaders'
    const keys = Object.keys(release.manifest.files ?? {})
      .filter(key => key.includes(include) && (tier === 'full' ? key.endsWith('.js') : isMinifiedLoader(key)))
    return { ...release, tier, keys }
  })
}
