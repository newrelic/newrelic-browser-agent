/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EXPERIMENTAL. Rewrites the browser agent's block of names in Angler's shared `metric_names.txt` to the set this repository generates, leaving
 * every other line of the file alone. The file is shared by many teams, so the one rule is: only a line that starts with `Browser/Supportability/`
 * is ever removed or added, and every other line stays exactly as it is, in the same order. `syncBrowserTags` checks that itself and throws
 * rather than return a file that breaks it.
 *
 * Usage:
 *   node tools/supportability-metrics/angler-sync.js --angler-file path/to/metric_names.txt [--keep-existing] [--max-removed-share 0.5]
 *     [--summary-file summary.md] [--dry-run]
 * It rewrites the file in place (unless `--dry-run`), writes a Markdown summary of what changed if asked, and exits 0 with "changed=true|false"
 * in $GITHUB_OUTPUT. It exits non-zero, without touching the file, if the file has no browser agent names (its naming may differ from what is
 * assumed here) or if it would remove more than `--max-removed-share` of them.
 *
 * Like angler-comment.js it runs with plain `node` in CI: the parser (`acorn`) is only needed to derive the `init` setting and feature flag names,
 * and without it those names are left out and the run stops.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { PREFIX, listConcreteTags, namesFromSource } = require('./angler')

/**
 * @typedef {Object} SyncResult
 * @property {string} text The new content of the file.
 * @property {string[]} added Browser agent names that were not in the file.
 * @property {string[]} removed Browser agent names that were in the file and are not any more.
 * @property {number} unchanged How many browser agent names were already there.
 * @property {boolean} scattered Whether the browser agent's lines were not one block. They are moved into one block, so anything between them (such as a comment) stays where it was and may end up away from them.
 */

/**
 * Replaces the browser agent's names in the text of `metric_names.txt` with the given names.
 * @param {string} existing The current text of the file.
 * @param {string[]} generated The full names (with the prefix) the file should hold for the browser agent.
 * @param {{keepExisting?: boolean}} [options] `keepExisting` keeps the browser agent names already in the file that are not in `generated` (nothing is removed).
 * @returns {SyncResult}
 * @throws {Error} If a name to write does not start with the prefix, or if any line that is not a browser agent name would change.
 */
function syncBrowserTags (existing, generated, { keepExisting = false } = {}) {
  const bad = generated.filter(name => !name.startsWith(PREFIX))
  if (bad.length) throw new Error(`Refusing to write names that do not start with ${PREFIX}: ${bad.slice(0, 3).join(', ')}`)

  const eol = existing.includes('\r\n') ? '\r\n' : '\n'
  const lines = existing.split(/\r?\n/)
  const endsWithNewline = lines[lines.length - 1] === ''
  if (endsWithNewline) lines.pop()

  const isBrowser = (line) => line.trim().startsWith(PREFIX)
  const current = lines.filter(isBrowser).map(line => line.trim())
  const wanted = [...new Set(generated)]
  const kept = keepExisting ? current.filter(name => !wanted.includes(name)) : []
  const block = [...wanted, ...kept]

  const others = lines.filter(line => !isBrowser(line))
  const firstBrowser = lines.findIndex(isBrowser)
  const insertAt = firstBrowser === -1 ? others.length : firstBrowser // no browser line comes before the first one, so this is its place among the others
  const next = [...others.slice(0, insertAt), ...block, ...others.slice(insertAt)]

  // The rule this whole file exists to keep: what is not a browser agent name comes out exactly as it went in
  const nextOthers = next.filter(line => !isBrowser(line))
  if (nextOthers.length !== others.length || nextOthers.some((line, i) => line !== others[i])) {
    throw new Error('Refusing to write: a line that is not a browser agent name would have changed.')
  }

  const browserLines = lines.map((line, i) => (isBrowser(line) ? i : -1)).filter(i => i !== -1)
  return {
    text: next.join(eol) + (endsWithNewline || !lines.length ? eol : ''),
    added: block.filter(name => !current.includes(name)),
    removed: current.filter(name => !block.includes(name)),
    unchanged: current.filter(name => block.includes(name)).length,
    scattered: browserLines.length > 1 && browserLines[browserLines.length - 1] - browserLines[0] !== browserLines.length - 1
  }
}

/**
 * @param {SyncResult} result
 * @param {number} existingCount How many browser agent names the file had.
 * @returns {string} Markdown describing the change, for the Angler pull request's description.
 */
function renderSummary (result, existingCount) {
  const list = (names) => '```text\n' + names.join('\n') + '\n```'
  const parts = [
    `Updates the browser agent's supportability metric names (\`${PREFIX}*\`) to the set generated from the registry in the browser agent repository. **No other line of the file is changed.**`,
    `**${result.added.length}** added, **${result.removed.length}** removed, **${result.unchanged}** unchanged (the file had ${existingCount} browser agent names).`
  ]
  if (result.scattered) parts.push('> The browser agent names were not in one block in the file. They are now, so comments or blank lines that were between them have moved.')
  if (result.removed.length) {
    parts.push(`### Removed (${result.removed.length})`, 'Older browser agent versions already in the wild keep sending these, and removing a name drops that data. Keep any that are still needed.', list(result.removed))
  }
  if (result.added.length) parts.push(`### Added (${result.added.length})`, list(result.added))
  return parts.join('\n\n') + '\n'
}

/** @returns {string[]} The full names the browser agent should have in Angler: the registry's, plus the `init` settings and feature flags found in the source. */
function generatedNames () {
  const { detectChanges } = require('./detect')
  const root = path.join(__dirname, '..', '..')
  const read = (file) => { try { return fs.readFileSync(path.join(root, file), 'utf8') } catch (err) { return undefined } }
  const listFiles = () => execFileSync('git', ['ls-files', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 }).split('\n').filter(Boolean)
  const detected = detectChanges({ files: [], listFiles, readBase: read, readHead: read })
  if (!detected) throw new Error('Could not work out the init settings and feature flags (is acorn installed?). Not continuing, because the names would be incomplete.')
  return [...new Set([...listConcreteTags(require('./registry')), ...namesFromSource(detected).all])]
}

function main (argv) {
  const valueOf = (flag) => argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined
  const file = valueOf('--angler-file')
  if (!file) throw new Error('Missing --angler-file <path to metric_names.txt>')
  const maxRemovedShare = Number(valueOf('--max-removed-share') ?? 0.5)

  const existing = fs.readFileSync(file, 'utf8')
  const existingCount = existing.split(/\r?\n/).filter(line => line.trim().startsWith(PREFIX)).length
  if (!existingCount) {
    throw new Error(`The file has no line that starts with ${PREFIX}, so its naming may differ from what this script assumes. Not touching it.`)
  }

  const result = syncBrowserTags(existing, generatedNames(), { keepExisting: argv.includes('--keep-existing') })
  if (existingCount && result.removed.length / existingCount > maxRemovedShare) {
    throw new Error(`This would remove ${result.removed.length} of ${existingCount} browser agent names, more than the ${Math.round(maxRemovedShare * 100)}% allowed (--max-removed-share). Not touching the file.`)
  }

  const changed = result.added.length > 0 || result.removed.length > 0 || result.scattered
  console.log(`Browser agent names in ${path.basename(file)}: ${existingCount} before; ${result.added.length} added, ${result.removed.length} removed, ${result.unchanged} unchanged${result.scattered ? ' (they were not in one block)' : ''}.`)
  if (changed && !argv.includes('--dry-run')) fs.writeFileSync(file, result.text)
  if (valueOf('--summary-file')) fs.writeFileSync(valueOf('--summary-file'), renderSummary(result, existingCount))
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nadded=${result.added.length}\nremoved=${result.removed.length}\n`)
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

module.exports = { syncBrowserTags, renderSummary, generatedNames }
