/*
 * Generates the integrity record for the npm tarball produced by `npm pack`. Uses only node built-ins.
 *
 * Usage: node generate-npm-integrity.mjs <tarball> <manifest-out> <checksums-out> [version] [commit]
 *
 * - <manifest-out>: JSON describing the tarball. `integrity` is the sha512 SRI string npm itself records in
 *   package-lock.json and the registry, so consumers can compare it directly. `sha256` matches the digest
 *   in the GitHub attestation subject.
 * - <checksums-out>: `sha256sum`-format listing, consumed as `subject-checksums` by
 *   actions/attest-build-provenance.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const [tarball, manifestOut, checksumsOut, version = '', commit = ''] = process.argv.slice(2)

if (!tarball || !manifestOut || !checksumsOut) {
  console.error('Usage: generate-npm-integrity.mjs <tarball> <manifest-out> <checksums-out> [version] [commit]')
  process.exit(1)
}

const contents = readFileSync(tarball)
const name = basename(tarball)
const sha256 = createHash('sha256').update(contents).digest('hex')
const integrity = `sha512-${createHash('sha512').update(contents).digest('base64')}`

writeFileSync(manifestOut, JSON.stringify({ version, commit, tarball: { name, sha256, integrity } }, null, 2) + '\n')
writeFileSync(checksumsOut, `${sha256}  ${name}\n`)
console.log(`Wrote npm integrity record for ${name}`)
