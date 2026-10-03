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

const { expandEntry } = require('./expand')

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
    changedOpenFamilies: !base ? [] : head.entries.filter(entry => isOpenFamily(entry) && baseEntries.get(entry.tag) !== JSON.stringify(entry)).map(entry => entry.tag)
  }
}

const count = (n, noun, plural = noun + 's') => `${n} ${n === 1 ? noun : plural}`
const block = (lines) => '```text\n' + lines.join('\n') + '\n```'

/**
 * GitHub strips all styling from comments, so the status is shown with a colored circle at the start of the summary line.
 * - green: nothing to do in Angler
 * - yellow: only removals, which should wait until older agent versions have aged out
 * - orange: names to add, or decisions for the author
 * @param {string[]} added Names this PR adds.
 * @param {string[]} removed Names this PR removes.
 * @param {string[]} decisions The checklist items.
 * @returns {{icon: string, title: string, intro: string, steps: function(number, number): string}}
 */
function getStatus (added, removed, decisions, registryChanged = true) {
  const registryChange = 'This PR changes the supportability metrics the agent reports.'
  if (!registryChanged) {
    return {
      icon: '🟢',
      title: 'Supportability dashboard changed: no Angler changes needed',
      intro: 'This PR changes the dashboard generator, not the supportability metric registry, so nothing needs to change in Angler. This comment is regenerated on every push.',
      steps: () => undefined
    }
  }
  if (!added.length && !decisions.length && !removed.length) {
    return {
      icon: '🟢',
      title: 'Supportability metrics changed: no Angler changes needed',
      intro: `${registryChange} It adds and removes no metric names and adds no \`init\` settings or feature flags, so nothing needs to change in Angler. This comment is regenerated on every push.`,
      steps: () => undefined
    }
  }
  if (!added.length && !decisions.length) {
    return {
      icon: '🟡',
      title: 'Supportability metrics changed: no Angler PR needed yet',
      intro: `${registryChange} It only removes metric names. This comment is regenerated on every push.`,
      steps: () => '### What you need to do\n\nNothing in Angler yet. The names under **Removed** should come out of Angler once older agent versions have aged out, or when you accept losing that data.'
    }
  }
  return {
    icon: '🟠',
    title: 'Supportability metrics changed: this PR needs a matching Angler PR',
    intro: `${registryChange} A metric only appears in dashboards once its exact name is in Angler's shared \`metric_names.txt\`, and Angler is updated by hand. This comment is regenerated on every push, so it always reflects the latest commit.`,
    steps: (decisionCount, removedCount) => [
      '### What you need to do',
      [
        `1. Open a pull request against **[agents/angler](${ANGLER_REPO_URL})** that edits [\`metric_names.txt\`](${ANGLER_FILE_URL}) (you need to be on the VPN).`,
        '2. Add the names under **Add to Angler** below' + (removedCount ? ', and handle **Removed** as described there.' : '.'),
        decisionCount ? '3. Work through **Needs your decision**. These cannot be generated, so you are the gatekeeper for them.' : undefined,
        `${decisionCount ? 4 : 3}. Link the Angler PR here by adding it to this PR's description.`
      ].filter(Boolean).join('\n')
    ].join('\n\n')
  }
}

/**
 * @param {string} url
 * @returns {string} The line that links the preview dashboard.
 */
const dashboardLink = (url) => `📊 **[Preview the dashboard for this PR](${url})**`

/**
 * The checklist of things only the author can decide, limited to what this pull request actually touches.
 * @param {import('./registry-types').Registry} head
 * @param {string[]} changedOpenFamilies Open-ended families whose registry entry this pull request changed.
 * @param {import('./detect').DetectedChanges | undefined} detected The `init` settings and feature flags found in the source, or undefined when that could not be worked out.
 * @returns {string[]} Markdown checklist items. Empty when nothing needs a decision.
 */
function listDecisions (head, changedOpenFamilies, detected) {
  const item = (name, text) => `- [ ] **\`${PREFIX}${name}\`**: ${text}`
  const isGeneratedFromCode = (entry) => entry.tag.startsWith('Config/') || entry.tag.startsWith('Feature_Flag/')
  const items = []

  // With the source analyzed, the exact names for settings and flags are listed under Add to Angler, so there is nothing left to decide about them
  if (!detected) head.entries.filter(isGeneratedFromCode).filter(isOpenFamily).forEach(entry => items.push(item(entry.tag, manualHint(entry))))

  head.entries.filter(entry => changedOpenFamilies.includes(entry.tag) && !(detected && isGeneratedFromCode(entry)))
    .forEach(entry => items.push(item(entry.tag, `${manualHint(entry)} _(this PR changed this family)_`)))
  return items
}

/**
 * @param {import('./detect').DetectedChanges | undefined} detected
 * @param {import('./registry-types').Registry | undefined} base The registry on the base branch, if it had one.
 * @returns {{all: string[], added: string[], removed: string[]}} The full metric names for the `init` settings and feature flags found in the source: all of them, and the ones
 *   this change adds and removes. Empty when the source could not be analyzed.
 */
function namesFromSource (detected, base) {
  if (!detected) return { all: [], added: [], removed: [] }
  // Angler has no reason to hold these names before the registry lists their family, so when the base branch has no entry for one, all of its names are new
  const baseHas = (start) => Boolean(base?.entries.some(entry => entry.tag.startsWith(start)))
  const flag = (name) => PREFIX + `Feature_Flag/${name}/Seen`
  const setting = ({ tag }) => PREFIX + tag
  const settings = detected.settings || []
  const flags = detected.flags || []
  return {
    all: [...settings.map(setting), ...flags.map(flag)],
    added: [
      ...(baseHas('Config/') ? detected.addedSettings : settings).map(setting),
      ...(baseHas('Feature_Flag/') ? detected.addedFlags : flags).map(flag)
    ],
    removed: detected.removedSettings.map(setting)
  }
}

/**
 * A prominent reminder about the open-ended families, whose names cannot be generated. The dashboards select them with a pattern, but only names
 * Angler holds are ever written to New Relic, so any name missing from Angler never reaches a dashboard.
 * @param {import('./registry-types').Registry} head
 * @param {import('./detect').DetectedChanges} [detected] When given, the families whose names were listed from the source are left out.
 * @returns {string | undefined} A blockquote (GitHub alerts do not render inside the collapsed comment), or undefined when the registry has no open-ended family.
 */
function openFamilyCallout (head, detected) {
  // The names of settings and flags are listed in full when the source was analyzed, so they are no longer open
  const families = head.entries.filter(isOpenFamily).filter(entry => !(detected && (entry.tag.startsWith('Config/') || entry.tag.startsWith('Feature_Flag/'))))
  if (!families.length) return undefined
  // Families with the same instruction are listed together, so it is only written once
  const byHint = new Map()
  families.forEach(entry => {
    const hint = manualHint(entry)
    byHint.set(hint, [...(byHint.get(hint) || []), `\`${PREFIX}${entry.tag}\``])
  })
  return [
    '> ### ⚠️ Make sure Angler has these names, or they will not show up in the dashboards',
    '>',
    '> These names cannot be generated, so they are not in the list below. The dashboards pick up every name Angler tracks in a family on their own, but Angler is curated by hand, and a name it does not list is never written to New Relic.',
    '>',
    ...[...byHint].map(([hint, tags]) => `> - ${tags.join(' and ')}: ${hint}`)
  ].join('\n')
}

/**
 * Renders the pull request comment, collapsed by default. Lines are left flush left on purpose: the comment action trims every line.
 * @param {import('./registry-types').Registry | undefined} base The registry on the base branch, if it had one.
 * @param {import('./registry-types').Registry} head The registry on the pull request.
 * @param {import('./detect').DetectedChanges} [detected] What the pull request does to `init` settings and feature flags. Without it, the
 *   checklist falls back to telling the author what to check.
 * @param {{dashboardUrl?: string}} [options] `dashboardUrl` is a link to the preview dashboard generated for this pull request. It is shown above the
 *   collapsed comment, so it can be followed without opening it.
 * @returns {string | undefined} Markdown, or undefined if the pull request does not change any supportability metric.
 */
function renderComment (base, head, detected, { dashboardUrl } = {}) {
  const diff = diffRegistries(base, head)
  const { relevant, changedOpenFamilies } = diff
  const fromSource = namesFromSource(detected, base)
  const unique = (names) => [...new Set(names)]
  // Changes to settings and flags matter even when the registry is unchanged, because the registry only has the family
  const added = unique([...diff.added, ...fromSource.added])
  const removed = unique([...diff.removed, ...fromSource.removed]).filter(name => !added.includes(name))
  // The link to the preview dashboard is worth a comment even when the registry did not change (the dashboard generator did)
  if (!relevant && !added.length && !removed.length && !dashboardUrl) return undefined

  const all = unique([...listConcreteTags(head), ...fromSource.all])
  // Nothing in Angler depends on a change that did not touch the registry
  const decisions = relevant ? listDecisions(head, changedOpenFamilies, detected) : []
  const status = getStatus(added, removed, decisions, relevant || Boolean(added.length || removed.length))
  const parts = [
    status.intro,
    status.steps(decisions.length, removed.length)
  ].filter(Boolean)

  if (!base) {
    parts.push('> The registry does not exist on the base branch, so every name is listed as new. Skip the ones Angler already has.')
  }

  // Shown whenever the PR needs an Angler change, since the generated generated list below can never include these
  const callout = status.icon === '🟠' ? openFamilyCallout(head, detected) : undefined
  if (callout) parts.push(callout)

  // Nothing to add in the green and yellow states, so the empty section would only add noise
  if (added.length || status.icon === '🟠') {
    parts.push(`### Add to Angler (${count(added.length, 'name')})`)
    parts.push(added.length ? block(added) : '_No new names in this PR._')
  }

  if (removed.length) {
    parts.push(
      `### Removed in this PR (${count(removed.length, 'name')})`,
      block(removed),
      '**Do not delete these from Angler yet.** Older agent versions already in the wild keep sending them, and deleting a name drops that data from dashboards. Remove them once those versions have aged out, or when you accept losing that data.'
    )
  }

  if (decisions.length) {
    parts.push(
      '### Needs your decision (cannot be generated)',
      'These names depend on things only known when the agent runs (an `init` setting, a flag name, an HTTP status code), so Angler is curated by hand for them. ' +
        (detected ? 'Only what this PR touches is listed.' : 'This PR could not be analyzed automatically, so check each one against your changes.'),
      decisions.join('\n')
    )
  } else if (status.icon === '🟠') { // the green and yellow intros already say so
    parts.push('### Needs your decision', 'Nothing in this PR needs a manual decision in Angler: it adds no `init` settings or feature flags and changes none of the open-ended families (status codes, audit combinations).')
  }

  parts.push(
    `<details><summary>Full list of names Angler should contain for this version of the registry (${count(all.length, 'name')})</summary>\n\n` + block(all) +
      '\n\nThis is every name the registry can list, plus the names for every `init` setting and feature flag found in the source' + (detected ? '' : ' (not available for this run, so they are missing)') + '. It does not include the open-ended families whose names depend on what happens at runtime (retry and connect response status codes, audit combinations), and Angler may legitimately hold more than this (names for older agent versions, and the curated ones).\n\n</details>'
  )

  // The whole comment is collapsed by default so it does not crowd the conversation. The summary line stays visible, so it carries the status and the counts.
  const decisionsSummary = decisions.length ? count(decisions.length, 'decision') : 'no decisions'
  const summary = `${status.icon} <strong>${status.title}</strong> (${count(added.length, 'name')} to add, ${removed.length} removed, ${decisionsSummary})`
  const collapsed = `<details>\n<summary>${summary}</summary>\n\n${parts.join('\n\n')}\n\n</details>\n`
  // The link goes above the collapsed section, so it is visible without opening the comment
  return dashboardUrl ? `${dashboardLink(dashboardUrl)}\n\n${collapsed}` : collapsed
}

module.exports = { PREFIX, ANGLER_REPO_URL, ANGLER_FILE_URL, listConcreteTags, diffRegistries, renderComment }
