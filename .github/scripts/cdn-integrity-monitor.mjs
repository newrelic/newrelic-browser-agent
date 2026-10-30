/*
 * Detects drift between what was released and what is currently being served.
 *
 * Each release attaches an integrity manifest (see generate-integrity-manifest.mjs) recording the sha384 of every
 * published file. This script downloads the manifests of the most recent releases and checks, using only public
 * endpoints and node built-ins (no credentials, no dependencies), that:
 *
 *   1. the CDN edge (js-agent.newrelic.com, staging-js-agent.newrelic.com) serves content matching the manifest
 *   2. the S3 origin (nr-browser-agent) serves content matching the manifest, independent of the CDN cache
 *   3. the loaders stored in the NR loader database match the manifest
 *   4. the mutable `-current` loaders match one of the checked releases (a rollback is legitimate, anything else isn't)
 *
 * Usage: node cdn-integrity-monitor.mjs [--repo owner/name] [--releases 5] [--include <regex>] [--manifest <path>...]
 *
 * --manifest bypasses release discovery and checks the given manifest file(s). It exists for testing and manual
 * verification. Exits 1 when any check finds a mismatch or cannot be completed, 0 otherwise.
 */
import { readFile, appendFile } from 'node:fs/promises'
import { sha384, matchesManifest } from '../actions/shared-utils/integrity.js'

const EDGE_HOSTS = ['js-agent.newrelic.com', 'staging-js-agent.newrelic.com']
const ORIGIN_HOST = 'nr-browser-agent.s3.amazonaws.com'
const NR_APIS = { stage: 'https://staging-api.newrelic.com', prod: 'https://api.newrelic.com' }
const LOADER_TYPES = ['rum', 'full', 'spa']
const MANIFEST_ASSET = 'integrity-manifest.json'

/**
 * Parses the small set of supported command line options.
 * @param {string[]} argv Arguments after the script name.
 * @returns {{repo: string, releases: number, include: RegExp, manifests: string[], concurrency: number}}
 */
function parseArgs (argv) {
  const options = { repo: process.env.GITHUB_REPOSITORY || 'newrelic/newrelic-browser-agent', releases: 5, include: /\.js$/, manifests: [], concurrency: 8 }
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=')
    const value = () => inline ?? argv[++i]
    if (flag === '--repo') options.repo = value()
    else if (flag === '--releases') options.releases = Number(value())
    else if (flag === '--include') options.include = new RegExp(value())
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
 * Finds the most recent releases that carry an integrity manifest and downloads them.
 * @param {ReturnType<typeof parseArgs>} options
 * @returns {Promise<Array<{version: string, manifest: {files: Record<string, {sha384: string}>}}>>} Newest first.
 */
async function discoverManifests (options) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetchWithRetry(`https://api.github.com/repos/${options.repo}/releases?per_page=30`, { headers })
  if (!response.ok) throw new Error(`Could not list releases: HTTP ${response.status}`)

  const found = []
  let skipped = 0
  for (const release of await response.json()) {
    if (release.draft || release.prerelease) continue
    const asset = release.assets?.find(a => a.name === MANIFEST_ASSET)
    if (!asset) { skipped++; continue }
    const download = await fetchWithRetry(asset.browser_download_url)
    if (!download.ok) throw new Error(`Could not download ${MANIFEST_ASSET} for ${release.tag_name}: HTTP ${download.status}`)
    found.push({ version: release.tag_name.replace(/^v/, ''), manifest: await download.json() })
    if (found.length >= options.releases) break
  }
  console.log(`Found ${found.length} release manifest(s); ${skipped} newer-or-older release(s) without one were skipped.`)
  return found
}

/**
 * @typedef {{check: string, target: string, kind: 'mismatch'|'unavailable', detail: string}} Finding
 */

/**
 * Downloads each manifested file from a host and compares its digest with the manifest.
 * @param {string} label Name of the check, used in reports.
 * @param {string} baseUrl Origin to fetch from, without a trailing slash.
 * @param {{version: string, manifest: object}} release
 * @param {RegExp} include Only files whose manifest key matches are checked.
 * @param {number} concurrency
 * @returns {Promise<{checked: number, findings: Finding[]}>}
 */
async function checkHost (label, baseUrl, release, include, concurrency) {
  const keys = Object.keys(release.manifest.files).filter(key => include.test(key))
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
 * Checks the loaders stored in the NR loader database against a manifest.
 * @param {{version: string, manifest: object}} release
 * @param {boolean} includeAliases Also check the fuzzy aliases (e.g. 1.324.x), which only the newest release owns.
 * @param {number} concurrency
 * @returns {Promise<{checked: number, findings: Finding[]}>}
 */
async function checkLoaderDatabase (release, includeAliases, concurrency) {
  const [major, minor] = release.version.split('.')
  const jobs = []
  for (const env of Object.keys(NR_APIS)) {
    for (const type of LOADER_TYPES) {
      for (const suffix of ['min.js', 'js']) {
        const key = `nr-loader-${type}-${release.version}.${suffix}`
        const names = [key]
        if (includeAliases) names.push(`nr-loader-${type}-${major}.${minor}.x.${suffix}`, `nr-loader-${type}-${major}.x.x.${suffix}`)
        for (const name of names) jobs.push({ env, key, name })
      }
    }
  }

  const findings = []
  await pool(jobs.map(({ env, key, name }) => async () => {
    const target = `${NR_APIS[env]}/v2/js_agent_loaders/version.json?loader_version=${name}`
    try {
      const response = await fetchWithRetry(target)
      if (!response.ok) {
        findings.push({ check: `nr-loader-db (${env})`, target, kind: 'unavailable', detail: `HTTP ${response.status}` })
        return
      }
      const loader = (await response.json())?.js_agent_loader?.loader
      if (typeof loader !== 'string' || !matchesManifest(release.manifest, key, Buffer.from(loader, 'utf-8'))) {
        findings.push({ check: `nr-loader-db (${env})`, target, kind: 'mismatch', detail: `stored loader ${name} does not match the ${release.version} manifest entry` })
      }
    } catch (error) {
      findings.push({ check: `nr-loader-db (${env})`, target, kind: 'unavailable', detail: String(error.message ?? error) })
    }
  }), concurrency)
  return { checked: jobs.length, findings }
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
const releases = options.manifests.length
  ? await Promise.all(options.manifests.map(async path => {
    const manifest = JSON.parse(await readFile(path, 'utf-8'))
    return { version: String(manifest.version).replace(/^v/, ''), manifest }
  }))
  : await discoverManifests(options)

if (!releases.length) {
  console.log('::warning::No release with an integrity manifest was found, so nothing was monitored. Expected until the first release that publishes one.')
  process.exit(0)
}

const summary = []
const findings = []
const record = (label, version, result) => {
  summary.push(`| ${version} | ${label} | ${result.checked} | ${result.findings.length} |`)
  findings.push(...result.findings)
}

for (const [index, release] of releases.entries()) {
  console.log(`\nChecking ${release.version}${index === 0 ? ' (newest)' : ''}`)
  for (const host of EDGE_HOSTS) record(`edge ${host}`, release.version, await checkHost(`edge ${host}`, `https://${host}`, release, options.include, options.concurrency))
  record('s3 origin', release.version, await checkHost('s3 origin', `https://${ORIGIN_HOST}`, release, options.include, options.concurrency))
  record('nr loader database', release.version, await checkLoaderDatabase(release, index === 0, options.concurrency))
}
console.log('\nChecking -current loaders')
record('-current loaders', 'all', await checkCurrent(releases))

const mismatches = findings.filter(f => f.kind === 'mismatch')
const unavailable = findings.filter(f => f.kind === 'unavailable')
const report = [
  `## CDN integrity monitor: ${findings.length ? 'FAILED' : 'passed'}`,
  '',
  '| Release | Check | Files checked | Problems |',
  '| --- | --- | --- | --- |',
  ...summary,
  ...(findings.length
    ? ['', `**${mismatches.length} mismatch(es), ${unavailable.length} unavailable.** A mismatch means served content differs from what was released; unavailable means the check could not complete.`, '', ...findings.slice(0, 50).map(f => `- **${f.kind}** \`${f.check}\` ${f.target}: ${f.detail}`)]
    : [])
].join('\n')

console.log(`\n${report}`)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report + '\n')
for (const f of mismatches.slice(0, 20)) console.log(`::error title=Integrity mismatch::${f.check}: ${f.target} ${f.detail}`)
for (const f of unavailable.slice(0, 20)) console.log(`::warning title=Integrity check incomplete::${f.check}: ${f.target} ${f.detail}`)
process.exit(findings.length ? 1 : 0)
