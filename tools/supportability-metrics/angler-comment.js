/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Writes the pull request comment that tells the author what to do in Angler, and sets the workflow output `relevant`.
 *
 *   node tools/supportability-metrics/angler-comment.js --out comment.md [--base-registry path/to/registry-on-the-base-branch.js] [--base-ref origin/main]
 *
 * With `--base-ref`, it also works out which `init` settings and feature flags the change adds, so the checklist lists only what applies.
 * That needs the parser (`acorn`) and git history; if either is missing it says so in the comment instead of failing.
 *
 * Without `--base-registry` (the base branch has no registry) every name is listed as new. When the registry is unchanged no file is
 * written and `relevant` is `false`, so the workflow does not comment.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { renderComment } = require('./angler')
const { detectChanges } = require('./detect')

const argv = process.argv.slice(2)
const valueOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
const out = valueOf('--out')
const baseRegistryPath = valueOf('--base-registry')
const baseRef = valueOf('--base-ref')

if (!out) {
  console.error('Missing --out <file to write the comment to>')
  process.exit(1)
}

const base = baseRegistryPath && fs.existsSync(baseRegistryPath) ? require(path.resolve(baseRegistryPath)) : undefined
/**
 * @param {string} ref A git ref or commit.
 * @returns {function(string): (string | undefined)} Reads a file as it is at that ref, or undefined if it did not exist there.
 */
const readAt = (ref) => (file) => {
  try { return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 * 20 }) } catch (err) { return undefined }
}

/** @returns {import('./detect').DetectedChanges | undefined} undefined if it cannot be worked out, e.g. no base ref, no parser, or no git history. */
function detect () {
  if (!baseRef) return undefined
  try {
    const mergeBase = execFileSync('git', ['merge-base', baseRef, 'HEAD'], { encoding: 'utf8' }).trim()
    const files = execFileSync('git', ['diff', '--name-only', mergeBase, 'HEAD', '--', 'src'], { encoding: 'utf8' }).split('\n').filter(Boolean)
    return detectChanges({ files, readBase: readAt(mergeBase), readHead: readAt('HEAD') })
  } catch (err) {
    return undefined
  }
}

const comment = renderComment(base, require('./registry'), detect())

if (comment) fs.writeFileSync(out, comment)
console.log(comment ? `Wrote the Angler comment to ${out}` : 'The supportability metric registry is unchanged, so there is nothing to tell the author.')
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `relevant=${Boolean(comment)}\n`)
