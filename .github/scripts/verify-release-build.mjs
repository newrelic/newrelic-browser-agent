/*
 * Compares a locally rebuilt release against the hashes published for it. Uses only node built-ins.
 *
 * Usage:
 *   node verify-release-build.mjs cdn <integrity-manifest.json> <build-dir>
 *   node verify-release-build.mjs npm <tarball> <expected-sha512-integrity> [npm-integrity-manifest.json]
 *
 * - cdn: every file listed in the manifest must exist in <build-dir> with the same sha384 SRI digest. Files in
 *   <build-dir> that the manifest does not list are reported but are not a failure.
 * - npm: the tarball's sha512 SRI digest must equal the registry's `dist.integrity`. When the release's
 *   npm-integrity-manifest.json is given, its sha256 and integrity must match as well.
 *
 * Exits non-zero on any mismatch.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [mode, ...args] = process.argv.slice(2)

/**
 * Computes a digest in SRI format, e.g. `sha384-<base64>`.
 * @param {'sha256'|'sha384'|'sha512'} algorithm
 * @param {Buffer} contents
 * @returns {string}
 */
function sri (algorithm, contents) {
  return `${algorithm}-${createHash(algorithm).update(contents).digest('base64')}`
}

/**
 * Recursively lists files under a directory as paths relative to it, using forward slashes.
 * @param {string} root
 * @param {string} [dir]
 * @returns {string[]}
 */
function listFiles (root, dir = root) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? listFiles(root, join(dir, entry.name)) : [relative(root, join(dir, entry.name)).split('\\').join('/')])
}

/**
 * Verifies a rebuilt CDN directory against the published manifest.
 * @param {string} manifestPath
 * @param {string} buildDir
 * @returns {boolean} true when every manifest entry matches.
 */
function verifyCdn (manifestPath, buildDir) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const entries = Object.entries(manifest.files || {})
  if (!entries.length) {
    console.error('Manifest lists no files')
    return false
  }
  const failures = []
  for (const [key, { sha384 }] of entries) {
    let contents
    try {
      contents = readFileSync(join(buildDir, key))
    } catch {
      failures.push(`missing from rebuild: ${key}`)
      continue
    }
    const actual = sri('sha384', contents)
    if (actual !== sha384) failures.push(`hash mismatch: ${key}\n    published ${sha384}\n    rebuilt   ${actual}`)
  }
  const unlisted = listFiles(buildDir).filter(file => !(file in manifest.files))
  if (unlisted.length) console.log(`Note: ${unlisted.length} rebuilt file(s) are not in the manifest and were not compared:\n  ${unlisted.join('\n  ')}`)
  if (failures.length) {
    console.error(`${failures.length} of ${entries.length} manifest entries failed:\n  ${failures.join('\n  ')}`)
    return false
  }
  console.log(`All ${entries.length} manifest entries match the rebuild`)
  return true
}

/**
 * Verifies a rebuilt npm tarball against the registry's integrity value and, optionally, the release's record.
 * @param {string} tarball
 * @param {string} expectedIntegrity The registry's `dist.integrity` (sha512 SRI).
 * @param {string} [manifestPath]
 * @returns {boolean}
 */
function verifyNpm (tarball, expectedIntegrity, manifestPath) {
  const contents = readFileSync(tarball)
  const integrity = sri('sha512', contents)
  const sha256 = createHash('sha256').update(contents).digest('hex')
  const failures = []
  if (integrity !== expectedIntegrity) failures.push(`registry integrity mismatch\n    registry ${expectedIntegrity}\n    rebuilt  ${integrity}`)
  if (manifestPath) {
    const { tarball: published } = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    if (published?.integrity !== integrity) failures.push(`release record integrity mismatch\n    record  ${published?.integrity}\n    rebuilt ${integrity}`)
    if (published?.sha256 !== sha256) failures.push(`release record sha256 mismatch\n    record  ${published?.sha256}\n    rebuilt ${sha256}`)
  }
  if (failures.length) {
    console.error(`npm tarball verification failed:\n  ${failures.join('\n  ')}`)
    return false
  }
  console.log(`npm tarball matches ${manifestPath ? 'the registry and the release record' : 'the registry'}`)
  return true
}

let ok = false
if (mode === 'cdn' && args.length === 2) ok = verifyCdn(...args)
else if (mode === 'npm' && (args.length === 2 || args.length === 3)) ok = verifyNpm(...args)
else {
  console.error('Usage: verify-release-build.mjs cdn <manifest> <build-dir> | npm <tarball> <integrity> [npm-manifest]')
  process.exit(2)
}
process.exit(ok ? 0 : 1)
