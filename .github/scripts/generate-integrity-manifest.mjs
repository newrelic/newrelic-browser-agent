/*
 * Generates the integrity manifest for a built CDN directory. Uses only node built-ins so it can run before
 * any dependencies are installed.
 *
 * Usage: node generate-integrity-manifest.mjs <build-dir> <manifest-out> <checksums-out> [version] [commit]
 *
 * - <manifest-out>: JSON mapping each file path (relative to <build-dir>, which matches its S3/CDN key) to its
 *   SRI-format sha384 digest. Customers can use these values as `integrity` attributes.
 * - <checksums-out>: `sha256sum`-format listing of the same files, consumed as `subject-checksums` by
 *   actions/attest-build-provenance.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const [buildDir, manifestOut, checksumsOut, version = '', commit = ''] = process.argv.slice(2)

if (!buildDir || !manifestOut || !checksumsOut) {
  console.error('Usage: generate-integrity-manifest.mjs <build-dir> <manifest-out> <checksums-out> [version] [commit]')
  process.exit(1)
}

/**
 * Recursively lists every file under a directory.
 * @param {string} dir Directory to walk.
 * @returns {string[]} Absolute-ish file paths, sorted for deterministic output.
 */
function listFiles (dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)])
    .sort()
}

const files = {}
const checksums = []

for (const file of listFiles(buildDir)) {
  const key = relative(buildDir, file).split('\\').join('/')
  const contents = readFileSync(file)
  files[key] = { sha384: `sha384-${createHash('sha384').update(contents).digest('base64')}` }
  checksums.push(`${createHash('sha256').update(contents).digest('hex')}  ${key}`)
}

if (!checksums.length) {
  console.error(`No files found in ${buildDir}`)
  process.exit(1)
}

writeFileSync(manifestOut, JSON.stringify({ version, commit, files }, null, 2) + '\n')
writeFileSync(checksumsOut, checksums.join('\n') + '\n')
console.log(`Wrote integrity manifest for ${checksums.length} files`)
