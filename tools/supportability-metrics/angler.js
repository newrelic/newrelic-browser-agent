/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Works out what a pull request author has to do in Angler, the internal service whose shared `metric_names.txt` must list a
 * supportability metric before it shows up in dashboards. Angler accepts only fully formed names and lives behind the internal GitHub, so
 * this does not touch it. It produces the text of a pull request comment that:
 * - lists the names this PR adds and removes, and the full list Angler should contain for this version of the registry,
 * - calls out what cannot be generated and so needs the author's judgment (names only known at runtime), and
 * - tells the author to open a pull request against Angler and link it.
 */

const { expandEntry } = require('./lib')

/** Every supportability metric in Angler's file starts with this. */
const PREFIX = 'Browser/Supportability/'
const ANGLER_REPO_URL = 'https://source.datanerd.us/agents/angler'
const ANGLER_FILE_URL = ANGLER_REPO_URL + '/blob/master/src/main/resources/metric_names.txt'

/**
 * @param {import('./registry-types').RegistryEntry} entry
 * @returns {boolean} Whether the entry has a placeholder that is not filled in by a list of values, so its names cannot be listed.
 */
const isOpenFamily = (entry) => /<[^>]*>/.test(entry.tag) && !entry.values

/**
 * @param {import('./registry-types').Registry | undefined} registry
 * @returns {string[]} The full names (with the prefix) the registry can list as concrete metrics, in registry order and without duplicates.
 */
function listConcreteTags (registry) {
  if (!registry) return []
  const tags = registry.entries.filter(entry => !isOpenFamily(entry)).flatMap(entry => expandEntry(entry).map(({ tag }) => PREFIX + tag))
  return [...new Set(tags)]
}

/**
 * What to tell the author about each kind of open-ended family. Matched by the start of the entry's tag.
 * @type {Array<[string, string]>}
 */
const MANUAL_HINTS = [
  ['Config/', 'If this PR adds or changes an `init` setting, decide whether to track `Config/<init path>/Enabled` (true booleans) or `Config/<init path>/Changed` (anything else that differs from the default), and add that exact name.'],
  ['Feature_Flag/', 'If this PR introduces a new feature flag, decide whether to track `Feature_Flag/<flag>/Seen` for it, and add that exact name.'],
  ['Harvester/Retry/Attempted/', 'Decide which features are worth tracking. Add the ones you want.'],
  ['Harvester/Retry/', 'Decide which HTTP status codes are worth tracking. Add the ones you want.'],
  ['BCS/Error/', 'Decide which HTTP status codes are worth tracking. Add the ones you want.'],
  ['audit/', 'Decide which audit combinations are worth tracking. Add the ones you want.']
]

/**
 * @param {import('./registry-types').RegistryEntry} entry
 * @returns {string} What the author should do about that family.
 */
const manualHint = (entry) => (MANUAL_HINTS.find(([start]) => entry.tag.startsWith(start)) || [])[1] || 'Decide which specific names are worth tracking, and add them.'

/**
 * @param {import('./registry-types').Registry | undefined} base The registry on the pull request's base branch, if it had one.
 * @param {import('./registry-types').Registry} head The registry on the pull request.
 * @returns {{relevant: boolean, added: string[], removed: string[], changedOpenFamilies: string[]}} What changed. `relevant` is false when the
 *   registry's entries and sections are identical, in which case the pull request has nothing to do with Angler.
 */
function diffRegistries (base, head) {
  const baseTags = new Set(listConcreteTags(base))
  const headTags = new Set(listConcreteTags(head))
  const key = (registry) => JSON.stringify({ sections: registry?.sections, entries: registry?.entries })
  const baseEntries = new Map((base?.entries || []).map(entry => [entry.tag, JSON.stringify(entry)]))
  return {
    relevant: key(base) !== key(head),
    added: [...headTags].filter(tag => !baseTags.has(tag)),
    removed: [...baseTags].filter(tag => !headTags.has(tag)),
    changedOpenFamilies: head.entries.filter(entry => isOpenFamily(entry) && baseEntries.get(entry.tag) !== JSON.stringify(entry)).map(entry => entry.tag)
  }
}

const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`
const block = (lines) => '```text\n' + lines.join('\n') + '\n```'

/**
 * Renders the pull request comment. Lines are left flush left on purpose: the comment action trims every line.
 * @param {import('./registry-types').Registry | undefined} base The registry on the base branch, if it had one.
 * @param {import('./registry-types').Registry} head The registry on the pull request.
 * @returns {string | undefined} Markdown, or undefined if the pull request does not change any supportability metric.
 */
function renderComment (base, head) {
  const { relevant, added, removed, changedOpenFamilies } = diffRegistries(base, head)
  if (!relevant) return undefined

  const all = listConcreteTags(head)
  const openFamilies = head.entries.filter(isOpenFamily)
  const parts = [
    '## Supportability metrics changed: this PR needs a matching Angler PR',
    'This PR changes the supportability metric registry. A metric only appears in dashboards once its exact name is in Angler\'s shared `metric_names.txt`, and Angler is updated by hand. ' +
      'This comment is regenerated on every push, so it always reflects the latest commit.',
    '### What you need to do',
    [
      `1. Open a pull request against **[agents/angler](${ANGLER_REPO_URL})** that edits [\`metric_names.txt\`](${ANGLER_FILE_URL}) (you need to be on the VPN).`,
      '2. Add the names under **Add to Angler** below, and handle **Removed** as described there.',
      '3. Work through **Needs your decision**. These cannot be generated, so you are the gatekeeper for them.',
      '4. Link the Angler PR here by adding it to this PR\'s description.'
    ].join('\n')
  ]

  if (!base) {
    parts.push('> The registry does not exist on the base branch, so every name is listed as new. Skip the ones Angler already has.')
  }

  parts.push(`### Add to Angler (${count(added.length, 'name')})`)
  parts.push(added.length ? block(added) : '_No new names in this PR._')

  if (removed.length) {
    parts.push(
      `### Removed in this PR (${count(removed.length, 'name')})`,
      block(removed),
      '**Do not delete these from Angler yet.** Older agent versions already in the wild keep sending them, and deleting a name drops that data from dashboards. Remove them once those versions have aged out, or when you accept losing that data.'
    )
  }

  parts.push(
    '### Needs your decision (cannot be generated)',
    'The names in these families are only known when the agent runs (an `init` setting path, a flag name, an HTTP status code), so they cannot be listed here. ' +
      'Angler is curated by hand for them.',
    openFamilies.map(entry => `- [ ] **\`${PREFIX}${entry.tag}\`**${changedOpenFamilies.includes(entry.tag) ? ' _(changed in this PR)_' : ''}: ${manualHint(entry)}`).join('\n')
  )

  parts.push(
    `<details><summary>Full list of names Angler should contain for this version of the registry (${count(all.length, 'name')})</summary>\n\n` + block(all) +
      '\n\nThis is every name the registry can list. It does not include the families above, and Angler may legitimately hold more than this (names for older agent versions, and the curated ones).\n\n</details>'
  )

  return parts.join('\n\n') + '\n'
}

module.exports = { PREFIX, ANGLER_REPO_URL, ANGLER_FILE_URL, listConcreteTags, diffRegistries, renderComment }
