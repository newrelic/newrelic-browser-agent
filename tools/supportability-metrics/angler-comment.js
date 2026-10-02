/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Writes the pull request comment that tells the author what to do in Angler, and sets the workflow output `relevant`.
 *
 *   node tools/supportability-metrics/angler-comment.js --out comment.md [--base-registry path/to/registry-on-the-base-branch.js]
 *
 * Without `--base-registry` (the base branch has no registry) every name is listed as new. When the registry is unchanged no file is
 * written and `relevant` is `false`, so the workflow does not comment.
 */

const fs = require('fs')
const path = require('path')
const { renderComment } = require('./angler')

const argv = process.argv.slice(2)
const valueOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
const out = valueOf('--out')
const baseRegistryPath = valueOf('--base-registry')

if (!out) {
  console.error('Missing --out <file to write the comment to>')
  process.exit(1)
}

const base = baseRegistryPath && fs.existsSync(baseRegistryPath) ? require(path.resolve(baseRegistryPath)) : undefined
const comment = renderComment(base, require('./registry'))

if (comment) fs.writeFileSync(out, comment)
console.log(comment ? `Wrote the Angler comment to ${out}` : 'The supportability metric registry is unchanged, so there is nothing to tell the author.')
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `relevant=${Boolean(comment)}\n`)
