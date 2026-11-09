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

/**
 * @typedef {Object} PlannedAlias
 * @property {string} key Alias file name, e.g. `nr-loader-spa-1.230.x.min.js`.
 * @property {boolean} required Whether the alias is expected to exist. A missing optional alias is skipped, not reported.
 * @property {string[]} digests Digests the alias may legitimately serve: the same loader from each release it can point at.
 */

/*
 * Mutable aliases customers can load instead of a pinned version: `-current`, `1.x.x` (latest 1.x) and `1.NNN.x` (latest
 * patch of that minor line). Only the minified loaders are covered, matching the rest of the monitor.
 */
const ALIAS_LOADERS = ['rum', 'full', 'spa'].flatMap(type => [`nr-loader-${type}`, `nr-loader-${type}-polyfills`])
const SEMVER = /^(\d+)\.(\d+)\.\d+$/

/**
 * Plans the checks for mutable alias files. An alias has no hash of its own, so the check is that it serves the same bytes
 * as the loader of a release it may point at. A rollback to an older release in range is legitimate; content that matches
 * none of them is not. `-current` may point at any release, `1.x.x` at any 1.x release, `1.NNN.x` at any release of that line.
 * @param {Array<{version: string, manifest: {files: Record<string, {sha384: string}>}}>} releases
 * @returns {PlannedAlias[]}
 */
export function planAliases (releases) {
  const groups = new Map([['current', []], ['1.x.x', []]])
  for (const release of releases) {
    const match = SEMVER.exec(release.version)
    if (!match) continue
    groups.get('current').push(release)
    if (match[1] === '1') {
      groups.get('1.x.x').push(release)
      const line = `1.${match[2]}.x`
      if (!groups.has(line)) groups.set(line, [])
      groups.get(line).push(release)
    }
  }
  const plans = []
  for (const [name, members] of groups) {
    for (const base of ALIAS_LOADERS) {
      const key = `${base}-${name}.min.js`
      /*
       * A release may also record, under `unverified.aliases`, the digest an alias legitimately serves when that is a different
       * build variant than its versioned file (1.230.0 was published more than once, with different chunk filename hashes).
       */
      const digests = members.flatMap(r => [r.manifest.files?.[`${base}-${r.version}.min.js`]?.sha384, r.manifest.unverified?.aliases?.[key]]).filter(Boolean)
      if (!digests.length) continue
      /* Only the unsuffixed loaders are guaranteed to have current and 1.x.x aliases; every other alias may legitimately not exist. */
      const required = (name === 'current' || name === '1.x.x') && !base.endsWith('-polyfills')
      plans.push({ key, required, digests: [...new Set(digests)] })
    }
  }
  return plans
}

/**
 * Compares two dotted version strings numerically, newest first. Versions that are not dotted numbers sort last.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function newestFirst (a, b) {
  const parts = v => v.split('.').map(Number)
  const [pa, pb] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const [x, y] = [pa[i] ?? 0, pb[i] ?? 0]
    if (Number.isNaN(x) !== Number.isNaN(y)) return Number.isNaN(x) ? 1 : -1
    if (x !== y) return y - x
  }
  return 0
}

/**
 * Joins values into one line, listing at most `limit` of them and saying how many were left out.
 * @param {string[]} values
 * @param {number} limit
 * @returns {string}
 */
function listLimited (values, limit) {
  return values.slice(0, limit).join(', ') + (values.length > limit ? ` (+${values.length - limit} more)` : '')
}

/**
 * Classifies a non-OK HTTP status for a file the manifest says should be served. A file that is gone (404, 403 or 410, which
 * S3 uses for a key it will not serve) is a real integrity problem; anything else, such as a 5xx, is treated as a transient
 * failure to check that may clear on its own.
 * @param {number} status HTTP status of the response.
 * @returns {'missing'|'unavailable'}
 */
export function kindForStatus (status) {
  return [403, 404, 410].includes(status) ? 'missing' : 'unavailable'
}

/**
 * Whether a finding should page someone straight away. Mismatches and missing files are integrity problems; `unavailable`
 * means the check itself could not complete, which only matters if it keeps happening.
 * @param {{kind: string}} finding
 * @returns {boolean}
 */
export function isUrgent (finding) {
  return finding.kind === 'mismatch' || finding.kind === 'missing'
}

/**
 * Describes some of a monitor run's findings in short single-line strings, safe to write as step outputs and to publish as
 * New Relic event attributes. Each string stays well under the 4,096 character limit on an event attribute value.
 * @param {Array<{kind: string, version?: string, alias?: string}>} findings
 * @returns {{count: string, versions: string, aliases: string, summary: string}}
 */
export function summarizeFindings (findings) {
  /* Whitespace is collapsed so a value can never span lines, which would let it inject extra step outputs. */
  const clean = value => String(value).replace(/\s+/g, ' ').trim()
  const versions = [...new Set(findings.map(f => f.version).filter(Boolean).map(clean))].sort(newestFirst)
  const aliases = [...new Set(findings.map(f => f.alias).filter(Boolean).map(clean))].sort()
  const counts = ['mismatch', 'missing', 'unavailable'].map(kind => `${findings.filter(f => f.kind === kind).length} ${kind}`)
  const parts = [counts.join(', ')]
  if (versions.length) parts.push(`releases: ${listLimited(versions, 10)}`)
  if (aliases.length) parts.push(`aliases: ${listLimited(aliases, 6)}`)
  return {
    count: String(findings.length),
    versions: listLimited(versions, 20),
    aliases: listLimited(aliases, 12),
    summary: parts.join('; ')
  }
}
