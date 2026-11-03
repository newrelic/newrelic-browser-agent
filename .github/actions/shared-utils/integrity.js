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
