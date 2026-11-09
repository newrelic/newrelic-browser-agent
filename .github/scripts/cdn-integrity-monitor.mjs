/*
 * Detects drift between what was released and what is currently being served.
 *
 * Each release attaches an integrity manifest (see generate-integrity-manifest.mjs) recording the sha384 of every
 * published file. This script downloads the manifests of every release that has one and checks, using only public
 * endpoints and node built-ins (no credentials, no dependencies), that:
 *
 *   1. the CDN edge (js-agent.newrelic.com, staging-js-agent.newrelic.com) serves content matching the manifest
 *   2. the S3 origin (nr-browser-agent) serves content matching the manifest, independent of the CDN cache
 *   3. the mutable `-current` loaders match one of the manifested releases (a rollback is legitimate, anything else isn't)
 *
 * Releases are checked in two tiers so that the whole release history can be swept every few minutes:
 *
 *   - full: the newest `--releases` releases, every .js file in the manifest (loaders and aggregate chunks)
 *   - loaders: every older release, only the minified entry-point loaders customers load (see isMinifiedLoader)
 *
 * A release without a manifest cannot be checked. It is counted and reported, never silently treated as passing.
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
import { sha384, matchesManifest, planChecks } from '../actions/shared-utils/integrity.js'

const EDGE_HOSTS = ['js-agent.newrelic.com', 'staging-js-agent.newrelic.com']
const ORIGIN_HOST = 'nr-browser-agent.s3.amazonaws.com'
const LOADER_TYPES = ['rum', 'full', 'spa']
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
 * Finds every release that carries an integrity manifest and downloads them.
 * @param {ReturnType<typeof parseArgs>} options
 * @returns {Promise<{found: Array<{version: string, manifest: {files: Record<string, {sha384: string}>}}>, skipped: number}>} found is newest first; skipped counts releases without a manifest.
 */
async function discoverManifests (options) {
  const withManifest = []
  let skipped = 0
  for (const release of await listReleases(options.repo)) {
    if (release.draft || release.prerelease) continue
    const asset = release.assets?.find(a => a.name === MANIFEST_ASSET)
    if (asset) withManifest.push({ release, asset })
    else skipped++
  }
  const found = await pool(withManifest.map(({ release, asset }) => async () => {
    const download = await fetchWithRetry(asset.browser_download_url)
    if (!download.ok) throw new Error(`Could not download ${MANIFEST_ASSET} for ${release.tag_name}: HTTP ${download.status}`)
    return { version: release.tag_name.replace(/^v/, ''), manifest: await download.json() }
  }), options.concurrency)
  console.log(`Found ${found.length} release manifest(s); ${skipped} release(s) without one cannot be checked.`)
  return { found, skipped }
}

/**
 * @typedef {{check: string, target: string, kind: 'mismatch'|'unavailable', detail: string}} Finding
 */

/**
 * Downloads each manifested file from a host and compares its digest with the manifest.
 * @param {string} label Name of the check, used in reports.
 * @param {string} baseUrl Origin to fetch from, without a trailing slash.
 * @param {import('../actions/shared-utils/integrity.js').PlannedRelease} release The release and the keys chosen for it by planChecks.
 * @param {number} concurrency
 * @returns {Promise<{checked: number, findings: Finding[]}>}
 */
async function checkHost (label, baseUrl, release, concurrency) {
  const { keys } = release
  const findings = []
  await pool(keys.map(key => async () => {
    const target = `${baseUrl}/${key}`
    try {
      const response = await fetchWithRetry(target)
      if (!response.ok) {
        findings.push({ check: label, target, kind: 'unavailable', detail: `HTTP ${response.status}` })
        return
      }
      if (!matchesManifest(release.manifest, key, await response.arrayBuffer())) {
        findings.push({ check: label, target, kind: 'mismatch', detail: `content does not match the ${release.version} manifest` })
      }
    } catch (error) {
      findings.push({ check: label, target, kind: 'unavailable', detail: String(error.message ?? error) })
    }
  }), concurrency)
  return { checked: keys.length, findings }
}

/**
 * The mutable -current loaders may legitimately point at an older release after a rollback, so they only need to
 * match a loader from one of the checked releases.
 * @param {Array<{version: string, manifest: object}>} releases
 * @returns {Promise<{checked: number, findings: Finding[]}>}
 */
async function checkCurrent (releases) {
  const findings = []
  let checked = 0
  for (const host of [...EDGE_HOSTS, ORIGIN_HOST]) {
    for (const type of LOADER_TYPES) {
      for (const suffix of ['min.js']) {
        const target = `https://${host}/nr-loader-${type}-current.${suffix}`
        checked++
        try {
          const response = await fetchWithRetry(target)
          if (!response.ok) { findings.push({ check: 'current-loaders', target, kind: 'unavailable', detail: `HTTP ${response.status}` }); continue }
          const digest = sha384(await response.arrayBuffer())
          const match = releases.find(r => r.manifest.files?.[`nr-loader-${type}-${r.version}.${suffix}`]?.sha384 === digest)
          if (!match) findings.push({ check: 'current-loaders', target, kind: 'mismatch', detail: 'content matches none of the checked releases' })
          else console.log(`  ${target} -> ${match.version}`)
        } catch (error) {
          findings.push({ check: 'current-loaders', target, kind: 'unavailable', detail: String(error.message ?? error) })
        }
      }
    }
  }
  return { checked, findings }
}

const options = parseArgs(process.argv.slice(2))
let skipped = 0
let releases
if (options.manifests.length) {
  releases = await Promise.all(options.manifests.map(async path => {
    const manifest = JSON.parse(await readFile(path, 'utf-8'))
    return { version: String(manifest.version).replace(/^v/, ''), manifest }
  }))
} else {
  ({ found: releases, skipped } = await discoverManifests(options))
}

if (!releases.length) {
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

for (const release of planned) {
  console.log(`\nChecking ${release.version} (${release.tier}, ${release.keys.length} file(s))`)
  for (const host of EDGE_HOSTS) record(release.tier, `edge ${host}`, await checkHost(`edge ${host}`, `https://${host}`, release, options.concurrency))
  record(release.tier, 's3 origin', await checkHost('s3 origin', `https://${ORIGIN_HOST}`, release, options.concurrency))
}
console.log('\nChecking -current loaders')
record('current', '-current loaders', await checkCurrent(releases))

for (const tier of ['full', 'loaders']) {
  const inTier = planned.filter(r => r.tier === tier)
  if (inTier.length) summary.push(`| ${tier} | ${inTier.length} release(s) | ${inTier.reduce((n, r) => n + r.keys.length, 0)} file(s) per host |`)
}
const emptyPlans = planned.filter(r => !r.keys.length).map(r => r.version)

const mismatches = findings.filter(f => f.kind === 'mismatch')
const unavailable = findings.filter(f => f.kind === 'unavailable')
const report = [
  `## CDN integrity monitor: ${findings.length ? 'FAILED' : 'passed'}`,
  '',
  '| Tier | Releases | Scope |',
  '| --- | --- | --- |',
  ...summary,
  '',
  `${skipped} release(s) have no integrity manifest and were not checked.` + (emptyPlans.length ? ` ${emptyPlans.length} manifested release(s) had no files to check: ${emptyPlans.slice(0, 20).join(', ')}.` : ''),
  '',
  '| Tier | Check | Files checked | Problems |',
  '| --- | --- | --- | --- |',
  ...[...totals.values()].map(t => `| ${t.tier} | ${t.label} | ${t.checked} | ${t.problems} |`),
  ...(findings.length
    ? ['', `**${mismatches.length} mismatch(es), ${unavailable.length} unavailable.** A mismatch means served content differs from what was released; unavailable means the check could not complete.`, '', ...findings.slice(0, 50).map(f => `- **${f.kind}** \`${f.check}\` ${f.target}: ${f.detail}`)]
    : [])
].join('\n')

console.log(`\n${report}`)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report + '\n')
for (const f of mismatches.slice(0, 20)) console.log(`::error title=Integrity mismatch::${f.check}: ${f.target} ${f.detail}`)
for (const f of unavailable.slice(0, 20)) console.log(`::warning title=Integrity check incomplete::${f.check}: ${f.target} ${f.detail}`)
process.exit(findings.length ? 1 : 0)
