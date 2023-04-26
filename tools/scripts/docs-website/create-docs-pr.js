/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const fse = require('fs-extra')
const path = require('path')
// const { program } = require('commander')

const Github = require('./github')
const git = require('./git-commands')

const DEFAULT_CHANGELOG_FILE_NAME = 'CHANGELOG.md'
const DEFAULT_BROWSERS_FILE_NAME = 'tools/jil/util/browsers-supported.json'
/** e.g. v7.2.1 */
const TAG_VALID_REGEX = /v\d+\.\d+\.\d+/
const BASE_BRANCH = 'develop'

var options = require('yargs')
  .usage('$0 [options]')

  .string('t')
  .alias('t', 'tag')
  .describe('t', 'tag name to get version of released agent')

  .string('r')
  .alias('r', 'remote')
  .describe('r', 'remote to push branch to')
  .default('r', 'origin')

  .string('c')
  .alias('c', 'changelog')
  .describe('c', `Name of changelog(defaults to ${DEFAULT_CHANGELOG_FILE_NAME})`)
  .default('c', DEFAULT_CHANGELOG_FILE_NAME)

  .string('b')
  .alias('b', 'browsers-file')
  .describe('b', `Name of JSON file with supported browser versions (defaults to ${DEFAULT_BROWSERS_FILE_NAME})`)
  .default('b', DEFAULT_BROWSERS_FILE_NAME)

  .boolean('f')
  .alias('f', 'force')
  .describe('f', 'bypass validation')
  .default('f', false)

  .boolean('d')
  .alias('d', 'dry-run')
  .describe('d', 'executes script but does not commit nor create PR')
  .default('d', false)

  .string('R')
  .alias('R', 'repo-path')
  .describe('R', 'Path to the docs-website form on local machine')
  .default('R', 'docs-website')

  .string('dse')
  .alias('dse', 'docs-site-email')
  .describe('dse', 'Email account to use when communicating with docs site repo -- git config user.email')

  .string('dsn')
  .alias('dsn', 'docs-site-name')
  .describe('dsn', 'Name to use when communicating with docs site repo -- git config user.name')

  .argv

const FORKED_DOCS_SITE = 'https://github.com/newrelic-forks/browser-agent-docs-website.git'

const RELEASE_NOTES_PATH =
    './src/content/docs/release-notes/new-relic-browser-release-notes/browser-agent-release-notes'

const SUPPORT_STATEMENT = `
## Support statement:
New Relic recommends that you upgrade the agent regularly to ensure that you're getting the latest features and performance benefits. Older releases will no longer be supported when they reach [end-of-life](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/browser-agent-eol-policy/). Release dates are reflective of the original publish date of the agent version.

New Browser Agent releases are rolled out to customers in small stages over a period of time. Because of this, the date the release becomes accessible to your account may not match the original publish date. Please see this [status dashboard](https://newrelic.github.io/newrelic-browser-agent-release/) for more information.`

if (!process.env.GITHUB_TOKEN) {
  console.log('NO GITHUB TOKEN FOUND!')
  process.exit(1)
}

async function createReleaseNotesPr () {
  console.log(`Script running with following options: ${JSON.stringify(options)}`)

  try {
    const version = options.tag.replace('refs/tags/', '')
    console.log(`Getting version from tag: ${version}`)

    logStep('Validation')
    validateTag(version, options.force)
    logStep('Get Release Notes from File')
    let { body, releaseDate } = await getReleaseNotes(version, options.changelog)
    body += '\n\n' + await getBrowserTargetStatement(version, options.browsersFile)
    logStep('Branch Creation')
    const branchName = await createBranch(options.repoPath, options.remote, version, options.dryRun, options.docsSiteEmail || 'browser-agent@newrelic.com', options.docsSiteName || 'Browser Agent Team')
    logStep('Format release notes file')
    const releaseNotesBody = formatReleaseNotes(releaseDate, version, body)
    logStep('Create Release Notes')
    await addReleaseNotesFile(releaseNotesBody, version)
    logStep('Commit Release Notes')
    await commitReleaseNotes(version, branchName, options.d)

    // TODO -- Add EOL Update
    // logStep('Update EOL')
    // logStep('Commit EOL')

    logStep('Create Pull Request')
    await createPR(version, branchName, options.dryRun)
    console.log('*** Full Run Successful ***')
  } catch (err) {
    if (err.status && err.status === 404) {
      console.log('404 status error detected. For octokit, this may mean insufficient permissions.')
      console.log('Ensure you have a valid GITHUB_TOKEN set in your env vars.')
    }

    stopOnError(err)
  } finally {
    process.chdir('..')
  }
}

/**
 * Validates tag matches version we want vX.X.X
 *
 * @param {string} version string to validate
 * @param {boolean} force flag to skip validation of tag
 */
function validateTag (version, force) {
  if (force) {
    console.log('--force set. Skipping validation logic')
    return
  }

  if (!TAG_VALID_REGEX.exec(version)) {
    console.log('Tag arg invalid (%s). Valid tags in form: v#.#.# (e.g. v7.2.1)', version)
    stopOnError()
  }
}

/**
 * Extracts the relevant changes from the NEWS.md
 *
 * @param {string} version the new version
 * @param {string} releaseNotesFile the filename where the release notes are stored
 */
async function getReleaseNotes (version, releaseNotesFile) {
  console.log('Retrieving release notes from file: ', releaseNotesFile)

  const data = await fse.readFile(process.cwd() + '/' + releaseNotesFile, 'utf8')

  const sections = data.split('\n## ')
  // Iterate over all past releases to find the version we want
  const versionChangeLog = sections.find((section) => section.startsWith(version))
  // e.g. v7.1.2 (2021-02-24)\n\n
  const body = versionChangeLog + SUPPORT_STATEMENT
  //   const [, releaseDate] = headingRegex.exec(versionChangeLog)
  // month and day should be in 2 digit format to allow for docs-site CI to run correctly
  const releaseDate = new Date().toLocaleDateString('sv')

  return { body, releaseDate }
}

/**
 * Extracts the supported browser versions from the specified JSON file and creates a support string.
 *
 * @param {string} version The new version.
 * @param {string} browsersFile The filename where the supported browsers JSON is stored.
 */
async function getBrowserTargetStatement (version, browsersFile) {
  console.log('Retrieving supported browser targets from file: ', browsersFile)

  const browserData = await fse.readJson(process.cwd() + '/' + browsersFile)

  const min = {}
  const max = {}

  for (let browser in browserData) {
    const versions = browserData[browser]
    min[browser] = Infinity
    max[browser] = -Infinity
    for (let browserVersion of versions) {
      const versionNumber = Number(browserVersion.version)
      min[browser] = min[browser] > versionNumber ? versionNumber : min[browser]
      max[browser] = max[browser] < versionNumber ? versionNumber : max[browser]
    }
  }

  const ANDROID_CHROME_VERSION = 100 // SauceLabs only offers one Android Chrome version

  return (
    'Consistent with our [browser support policy](https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/#browser-types), ' +
    `version ${version} of the Browser agent was built for and tested against these browsers and version ranges: ` +
    `Chrome ${min.chrome}-${max.chrome}, Edge ${min.edge}-${max.edge}, Safari ${min.safari}-${max.safari}, Firefox ${min.firefox}-${max.firefox}; ` +
    `and for mobile devices, Android Chrome ${ANDROID_CHROME_VERSION} and iOS Safari ${min.ios}-${max.ios}.`
  )
}

/**
 * Creates a branch in your local `docs-website` fork
 * That follows the pattern `add-browser-agent-<new agent version>`
 *
 * @param {string} filePath path to the `docs-website` fork
 * @param {string} version newest version of agent
 * @param {boolean} dryRun skip branch creation
 */
async function createBranch (filePath, remote, version, dryRun, email, name) {
  fse.rmSync(filePath, { recursive: true, force: true })
  fse.mkdirSync(filePath)
  filePath = path.resolve(filePath)
  console.log(`Changing to ${filePath}`)
  process.chdir(filePath)
  const branchName = `add-browser-agent-${version}`
  if (dryRun) {
    console.log(`Dry run indicated (--dry-run), not creating branch ${branchName}`)
  } else {
    try {
      await git.deleteUpstreamBranch(remote, branchName)
    } catch (e) {
      // repo and/or branch does not exist, no action needed
    }
    await git.clone(FORKED_DOCS_SITE, filePath, [])
    await git.checkout(BASE_BRANCH)
    await git.syncWithParent(remote, branchName)
    await git.checkoutNewBranch(branchName)
    await git.setUserInfo(email, name)
  }

  return branchName
}

/**
 * Formats the .mdx to adhere to the docs team standards for
 * release notes.
 *
 * @param {string} releaseDate date the release was created
 * @param {string} version version number
 * @param {string} body list of changes
 * @returns {string} appropriately formatted release notes
 */
function formatReleaseNotes (releaseDate, version, body) {
  const releaseNotesBody = [
    '---',
    'subject: Browser agent',
        `releaseDate: '${releaseDate}'`,
        `version: ${version.substr(1)}`, // remove the `v` from start of version
        '---',
        '',
        '## ' +
        body
  ].join('\n')

  console.log(`Release Notes Body \n${releaseNotesBody}`)
  return releaseNotesBody
}

/**
 * Writes the contents of the release notes to the docs-website fork
 *
 * @param {string} body contents of the .mdx
 * @param {string} version version number
 */
function addReleaseNotesFile (body, version) {
  const FILE = getFileName(version)
  return new Promise((resolve, reject) => {
    fse.writeFile(FILE, body, 'utf8', (writeErr) => {
      if (writeErr) {
        reject(writeErr)
      }

      console.log(`Added new release notes ${FILE}`)
      resolve()
    })
  })
}

function getFileName (version) {
  // change `v0.0.0` to `0-0-0`
  // version = version.substr(1).replace(/\./g, '-')
  const FILE = `browser-agent-${version}.mdx`
  return `${RELEASE_NOTES_PATH}/${FILE}`
}

/**
 * Commits release notes to the local fork and pushes to proper branch.
 *
 * @param {string} version version number
 * @param {string} remote github remote
 * @param {string} branch github branch
 * @param {boolean} dryRun whether or not we should actually update the repo
 */
async function commitReleaseNotes (version, branch, dryRun) {
  if (dryRun) {
    console.log('Dry run indicated (--dry-run), skipping committing release notes.')
    return
  }

  console.log(`Adding release notes for ${version}`)
  const files = [getFileName(version)]
  await git.addFiles(files)
  await git.commit(`chore: Add Browser agent ${version} release notes.`)
  await git.pushToRemote(branch)
}

/**
 * Creates a PR to the newrelic/docs-website with new release notes
 *
 * @param {string} version version number
 * @param {string} branch github branch
 * @param {boolean} dryRun whether or not we should actually create the PR
 */
async function createPR (version, branch, dryRun) {
  if (!process.env.GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN required to create a pull request')
    stopOnError()
  }

  const github = new Github('newrelic', 'docs-website')
  const title = `Browser Agent ${version} Release Notes`
  const prOptions = {
    head: `newrelic-forks:${branch}`,
    base: BASE_BRANCH,
    title,
    body: title
  }

  console.log(`Creating PR with following options: ${JSON.stringify(prOptions)}\n\n`)

  if (dryRun) {
    console.log('Dry run indicated (--dry-run), skipping creating pull request.')
    return
  }

  return await github.createPR(prOptions)
}

/**
 * Logs error and exits script on failure
 *
 * @param {Error} err If present, an error that occurred during script execution
 */
function stopOnError (err) {
  if (err) {
    console.error(err)
  }

  console.log('Halting execution with exit code: 1')
  process.exit(1)
}

/**
 * Logs formatted msg
 *
 * @param {string} step the current step of the script
 */
function logStep (step) {
  console.log(`\n ----- [Step]: ${step} -----\n`)
}

createReleaseNotesPr()
