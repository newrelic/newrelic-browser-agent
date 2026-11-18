/*
 * Detects drift between what was released and what is currently being served.
 *
 * Each release attaches an integrity manifest (see generate-integrity-manifest.mjs) recording the sha384 of every
 * published file. This script downloads the manifests of every release that has one and checks, using only public
 * endpoints and node built-ins (no credentials, no dependencies), that:
 *
 *   1. the CDN edge (js-agent.newrelic.com, staging-js-agent.newrelic.com) serves content matching the manifest
 *   2. the S3 origin (nr-browser-agent) serves content matching the manifest, independent of the CDN cache
 *   3. the mutable alias loaders (`-current`, `1.x.x`, `1.NNN.x`) match a release they may point at (a rollback within
 *      range is legitimate, anything else isn't)
 *   4. every published release carries a manifest, so a release published without one fails the run, unless it was
 *      its publish-release run is still going (it waits on a manual approval before attaching the manifest and uploading files)
 *
 * Releases are checked in two tiers so that the whole release history can be swept every few minutes:
 *
 *   - full: the newest `--releases` releases, every .js file in the manifest (loaders and aggregate chunks)
 *   - loaders: every older release, only the minified entry-point loaders customers load (see isMinifiedLoader)
 *
 * A release without a manifest cannot be checked, so it fails the run instead of being silently treated as passing.
 *
 * The NR loader database is deliberately not checked here: reading it requires an API key, and this script runs on a
 * schedule with no credentials. The release workflow verifies the database against the same manifest (nr-verify).
 *
 * Usage: node cdn-integrity-monitor.mjs [--repo owner/name] [--releases 5] [--include <text>] [--manifest <path>...]
 *
 * --releases is the number of newest releases that get the full check; all older releases get the loaders check.
 * --manifest bypasses release discovery and checks the given manifest file(s). It exists for testing and manual
 * verification. Exits 1 when any check finds a mismatch or cannot be completed, 0 otherwise.
 */
import { readFile, appendFile } from 'node:fs/promises'
import { sha384, matchesManifest, planChecks, planAliases, summarizeFindings, kindForStatus, isUrgent, sortReleasesNewestFirst, isWithinGrace, isPipelineActive, describeError, isAbsentStatus } from '../actions/shared-utils/integrity.js'

const EDGE_HOSTS = ['js-agent.newrelic.com', 'staging-js-agent.newrelic.com']
const ORIGIN_HOST = 'nr-browser-agent.s3.amazonaws.com'
const MANIFEST_ASSET = 'integrity-manifest.json'

/**
 * Parses the small set of supported command line options.
 * @param {string[]} argv Arguments after the script name.
 * @returns {{repo: string, releases: number, include: string, manifests: string[], concurrency: number}}
 */
function parseArgs (argv) {
  const options = { repo: process.env.GITHUB_REPOSITORY || 'newrelic/newrelic-browser-agent', releases: 5, include: '', manifests: [], concurrency: 16 }
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=')
    const value = () => inline ?? argv[++i]
    if (flag === '--repo') options.repo = value()
    else if (flag === '--releases') options.releases = Number(value())
    else if (flag === '--include') options.include = value()
    else if (flag === '--manifest') options.manifests.push(value())
    else if (flag === '--concurrency') options.concurrency = Number(value())
    else throw new Error(`Unknown option ${flag}`)
  }
  return options
}

/**
 * Fetches a URL with a timeout and a few retries so that a transient network error is not reported as a mismatch.
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry (url, init = {}) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) })
      if (response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 1000))
  }
  throw lastError
}

/**
 * Runs async tasks with a bounded number in flight.
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {number} limit
 * @returns {Promise<T[]>}
 */
async function pool (tasks, limit) {
  const results = new Array(tasks.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }))
  return results
}

/**
 * Lists every published release, following pagination, newest first.
 * @param {string} repo `owner/name`
 * @returns {Promise<Array<{tag_name: string, draft: boolean, prerelease: boolean, assets?: Array<{name: string, browser_download_url: string}>}>>}
 */
async function listReleases (repo) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const perPage = 100
  const releases = []
  /* The page cap is a backstop against a runaway loop, not an expected limit: 50 pages is 5,000 releases. */
  for (let page = 1; page <= 50; page++) {
    const response = await fetchWithRetry(`https://api.github.com/repos/${repo}/releases?per_page=${perPage}&page=${page}`, { headers })
    if (!response.ok) throw new Error(`Could not list releases (page ${page}): HTTP ${response.status}`)
    const batch = await response.json()
    releases.push(...batch)
    if (batch.length < perPage) break
  }
  return releases
}

/**
 * Looks up the Publish Release workflow runs, by release tag, so a release whose pipeline is still running (for example
 * waiting on approval) is not reported as broken for lacking a manifest or files yet.
 * @param {string} repo `owner/name`
 * @returns {Promise<Map<string, {status: string}>|null>} Null when the runs could not be listed; callers then fall back to a time window.
 */
async function listPublishRuns (repo) {
  try {
    const headers = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    const response = await fetchWithRetry(`https://api.github.com/repos/${repo}/actions/workflows/publish-release.yml/runs?event=release&per_page=100`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { workflow_runs: runs = [] } = await response.json()
    /* For a release event the run's head_branch is the release tag. The newest run per tag wins. */
    const byTag = new Map()
    for (const run of runs) if (!byTag.has(run.head_branch)) byTag.set(run.head_branch, run)
    return byTag
  } catch (error) {
    console.log(`::warning::Could not list Publish Release runs (${describeError(error)}); using a time window to tell new releases from broken ones.`)
    return null
  }
}

/**
 * Finds every release that carries an integrity manifest and downloads them.
 * A release without a manifest, or whose manifest cannot be downloaded, does not stop the run: it is reported as a finding
 * and the rest are still checked. A release whose publish pipeline is still running is reported as unavailable instead of missing, because
 * the manifest is attached late in that pipeline, after a manual approval.
 * @param {ReturnType<typeof parseArgs>} options
 * @returns {Promise<{found: Array<{version: string, pending?: boolean, manifest: {files: Record<string, {sha384: string}>}}>, skipped: string[], findings: Finding[]}>} found is sorted newest version first; skipped lists the tags of releases that could not be checked.
 */
async function discoverManifests (options) {
  const withManifest = []
  const skipped = []
  const findings = []
  const runs = await listPublishRuns(options.repo)
  /* With the runs listed, a release is pending while its run is going; a tag with no run yet is just-published if it is recent. */
  const isPending = release => runs?.has(release.tag_name) ? isPipelineActive(runs.get(release.tag_name)) : isWithinGrace(release.published_at)
  for (const release of await listReleases(options.repo)) {
    if (release.draft || release.prerelease) continue
    const asset = release.assets?.find(a => a.name === MANIFEST_ASSET)
    if (asset) {
      withManifest.push({ release, asset, pending: isPending(release) })
      continue
    }
    skipped.push(release.tag_name)
    const pending = isPending(release)
    findings.push({
      check: 'manifests',
      target: release.tag_name,
      kind: pending ? 'unavailable' : 'missing',
      detail: pending ? 'its publish pipeline is still running and has not attached integrity-manifest.json yet' : 'published release has no integrity-manifest.json, so its files cannot be verified',
      version: release.tag_name.replace(/^v/, '')
    })
  }
  const downloaded = await pool(withManifest.map(({ release, asset, pending }) => async () => {
    const version = release.tag_name.replace(/^v/, '')
    try {
      const download = await fetchWithRetry(asset.browser_download_url)
      if (!download.ok) throw new Error(`HTTP ${download.status}`)
      return { version, pending, manifest: await download.json() }
    } catch (error) {
      skipped.push(release.tag_name)
      findings.push({ check: 'manifests', target: release.tag_name, kind: 'unavailable', detail: `could not download ${MANIFEST_ASSET}: ${describeError(error)}`, version })
      return null
    }
  }), options.concurrency)
  /* Releases come back in GitHub's creation order, but the tiers are assigned by version, so sort by it. */
  const found = sortReleasesNewestFirst(downloaded.filter(Boolean))
  console.log(`Found ${found.length} release manifest(s); ${skipped.length} release(s) could not be checked.`)
  return { found, skipped, findings }
}

/**
 * @typedef {{check: string, target: string, kind: 'mismatch'|'missing'|'unavailable', detail: string, version?: string, alias?: string}} Finding
 * version is the release the finding belongs to; alias is the alias file name for findings about a mutable alias.
 * mismatch: served content differs from the manifest. missing: the file is not served. unavailable: the check could not complete.
 */

/**
 * Builds one task per file, host and release, so the whole sweep shares a single pool and is not limited by how many files
 * one release has. Each task records its own findings.
 * @param {import('../actions/shared-utils/integrity.js').PlannedRelease[]} planned
 * @param {Array<{label: string, baseUrl: string}>} hosts
 * @param {(tier: string, label: string, result: {checked: number, findings: Finding[]}) => void} record
 * @returns {Array<() => Promise<void>>}
 */
function planHostTasks (planned, hosts, record) {
  const tasks = []
  for (const release of planned) {
    /* While the release pipeline is still running a file may not be uploaded yet, so a missing file is only an incomplete check. */
    const pending = Boolean(release.pending)
    for (const { label, baseUrl } of hosts) {
      for (const key of release.keys) {
        tasks.push(async () => {
          const target = `${baseUrl}/${key}`
          const finding = (kind, detail) => ({ check: label, target, kind, detail, version: release.version })
          try {
            const response = await fetchWithRetry(target)
            if (!response.ok) {
              const kind = kindForStatus(response.status)
              record(release.tier, label, { checked: 1, findings: [finding(kind === 'missing' && pending ? 'unavailable' : kind, `HTTP ${response.status}`)] })
            } else if (!matchesManifest(release.manifest, key, await response.arrayBuffer())) {
              record(release.tier, label, { checked: 1, findings: [finding('mismatch', `content does not match the ${release.version} manifest`)] })
            } else {
              record(release.tier, label, { checked: 1, findings: [] })
            }
          } catch (error) {
            record(release.tier, label, { checked: 1, findings: [finding('unavailable', describeError(error))] })
          }
        })
      }
    }
  }
  return tasks
}

/**
 * Checks the mutable alias loaders (`-current`, `1.x.x`, `1.NNN.x`) on every host. An alias must serve the same bytes as
 * the loader of a release it may point at, so a rollback within range passes and anything else is a mismatch.
 * @param {Array<{version: string, manifest: object}>} releases
 * @param {number} concurrency
 * @returns {Promise<{checked: number, findings: Finding[]}>}
 */
async function checkAliases (releases, concurrency) {
  const findings = []
  let checked = 0
  const tasks = []
  for (const host of [...EDGE_HOSTS, ORIGIN_HOST]) {
    for (const alias of planAliases(releases)) {
      tasks.push(async () => {
        const target = `https://${host}/${alias.key}`
        try {
          const response = await fetchWithRetry(target)
          if (isAbsentStatus(response.status) && !alias.required) return
          checked++
          if (!response.ok) { findings.push({ check: 'aliases', target, kind: kindForStatus(response.status), detail: `HTTP ${response.status}`, alias: alias.key }); return }
          if (!alias.digests.includes(sha384(await response.arrayBuffer()))) {
            findings.push({ check: 'aliases', target, kind: 'mismatch', detail: 'content matches none of the releases this alias may point at', alias: alias.key })
          }
        } catch (error) {
          checked++
          findings.push({ check: 'aliases', target, kind: 'unavailable', detail: describeError(error), alias: alias.key })
        }
      })
    }
  }
  await pool(tasks, concurrency)
  return { checked, findings }
}

const options = parseArgs(process.argv.slice(2))
let skipped = []
let discoveryFindings = []
let releases
if (options.manifests.length) {
  releases = await Promise.all(options.manifests.map(async path => {
    const manifest = JSON.parse(await readFile(path, 'utf-8'))
    return { version: String(manifest.version).replace(/^v/, ''), manifest }
  }))
} else {
  ({ found: releases, skipped, findings: discoveryFindings } = await discoverManifests(options))
}

if (!releases.length && !skipped.length && !discoveryFindings.length) {
  console.log('::warning::No release with an integrity manifest was found, so nothing was monitored. Expected until the first release that publishes one.')
  process.exit(0)
}

const planned = planChecks(releases, options.releases, options.include)
const summary = []
const findings = []
/* Totals per tier and check, so the report stays readable when hundreds of releases are covered. */
const totals = new Map()
const record = (tier, label, result) => {
  const total = totals.get(`${tier}|${label}`) ?? { tier, label, checked: 0, problems: 0 }
  total.checked += result.checked
  total.problems += result.findings.length
  totals.set(`${tier}|${label}`, total)
  findings.push(...result.findings)
}

console.log(`\nChecking ${planned.length} release(s) on ${EDGE_HOSTS.length + 1} host(s)`)
const hosts = [...EDGE_HOSTS.map(host => ({ label: `edge ${host}`, baseUrl: `https://${host}` })), { label: 's3 origin', baseUrl: `https://${ORIGIN_HOST}` }]
await pool(planHostTasks(planned, hosts, record), options.concurrency)
console.log('\nChecking alias loaders')
record('aliases', 'alias loaders', await checkAliases(releases, options.concurrency))
/*
 * A manifested release with nothing to check (for example the loader pattern stopped matching its file names) would
 * otherwise go unmonitored without anyone noticing, so it is reported as a finding.
 */
const emptyPlans = planned.filter(r => !r.keys.length && !options.include)
record('manifests', 'release manifests', {
  checked: releases.length + skipped.length,
  findings: [
    ...discoveryFindings,
    ...emptyPlans.map(r => ({ check: 'manifests', target: `v${r.version}`, kind: 'unavailable', detail: `no ${r.tier === 'full' ? '.js' : 'minified loader'} files in the manifest to check`, version: r.version }))
  ]
})

for (const tier of ['full', 'loaders']) {
  const inTier = planned.filter(r => r.tier === tier)
  if (inTier.length) summary.push(`| ${tier} | ${inTier.length} release(s) | ${inTier.reduce((n, r) => n + r.keys.length, 0)} file(s) per host |`)
}

const mismatches = findings.filter(f => f.kind === 'mismatch')
const missing = findings.filter(f => f.kind === 'missing')
const unavailable = findings.filter(f => f.kind === 'unavailable')
const report = [
  `## CDN integrity monitor: ${findings.length ? 'FAILED' : 'passed'}`,
  '',
  '| Tier | Releases | Scope |',
  '| --- | --- | --- |',
  ...summary,
  '',
  `${skipped.length} release(s) could not be checked (no manifest, or it could not be downloaded).` + (emptyPlans.length ? ` ${emptyPlans.length} manifested release(s) had no files to check: ${emptyPlans.slice(0, 20).map(r => r.version).join(', ')}.` : ''),
  '',
  '| Tier | Check | Files checked | Problems |',
  '| --- | --- | --- | --- |',
  ...[...totals.values()].map(t => `| ${t.tier} | ${t.label} | ${t.checked} | ${t.problems} |`),
  ...(findings.length
    ? ['', `**${mismatches.length} mismatch(es), ${missing.length} missing, ${unavailable.length} unavailable.** A mismatch means served content differs from what was released; missing means a released file is not being served; unavailable means the check could not complete.`, '', ...findings.slice(0, 50).map(f => `- **${f.kind}** \`${f.check}\` ${f.target}: ${f.detail}`)]
    : [])
].join('\n')

console.log(`\n${report}`)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report + '\n')
for (const f of mismatches.slice(0, 20)) console.log(`::error title=Integrity mismatch::${f.check}: ${f.target} ${f.detail}`)
for (const f of missing.slice(0, 20)) console.log(`::error title=Released file not served::${f.check}: ${f.target} ${f.detail}`)
for (const f of unavailable.slice(0, 20)) console.log(`::warning title=Integrity check incomplete::${f.check}: ${f.target} ${f.detail}`)
/*
 * Exposed as step outputs so the notify job can describe the failure in a New Relic event without re-running the check.
 * Mismatches and missing files are urgent and published as failure_*; checks that could not complete are published as
 * error_*, which only pages if they keep happening. Each set is written only when it has findings.
 */
if (findings.length && process.env.GITHUB_OUTPUT) {
  const lines = []
  for (const [prefix, group] of [['failure', findings.filter(isUrgent)], ['error', findings.filter(f => !isUrgent(f))]]) {
    if (!group.length) continue
    const summary = summarizeFindings(group)
    lines.push(`${prefix}_count=${summary.count}`, `${prefix}_versions=${summary.versions}`, `${prefix}_aliases=${summary.aliases}`, `${prefix}_summary=${summary.summary}`)
  }
  await appendFile(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n')
}
process.exit(findings.length ? 1 : 0)
