/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import fse from 'fs-extra'
import path from 'path'

import Github from './github.mjs'
import git from './git-commands.mjs'

import yargs from 'yargs/yargs'

import chalk from 'chalk'

const DEFAULT_CHANGELOG_FILE_NAME = 'changelog.json'
const DEFAULT_BROWSERS_FILE_NAME = 'tools/jil/util/browsers-supported.json'

const DEFAULT_DOCS_SITE_USER_EMAIL = 'browser-agent@newrelic.com'
const DEFAULT_DOCS_SITE_USER_NAME = 'Browser Agent Team'

const SUPPORT_STATEMENT =
  '## Support statement:' +
  '\n\n' +
  'New Relic recommends that you upgrade the agent regularly to ensure that you\'re getting the latest features and performance benefits. Older releases will no longer be supported when they reach [end-of-life](https://docs.newrelic.com/docs/browser/browser-monitoring/getting-started/browser-agent-eol-policy/). Release dates are reflective of the original publish date of the agent version.' +
  '\n\n' +
  'New Browser Agent releases are rolled out to customers in small stages over a period of time. Because of this, the date the release becomes accessible to your account may not match the original publish date. Please see this [status dashboard](https://newrelic.github.io/newrelic-browser-agent-release/) for more information.'

const TAG_VALID_REGEX = /v\d+\.\d+\.\d+/ // e.g. v7.2.1

const ANDROID_CHROME_VERSION = 100 // for browser target statement; SauceLabs only offers one Android Chrome version

const FORKED_DOCS_SITE = 'https://github.com/newrelic-forks/browser-agent-docs-website.git'
const BASE_BRANCH = 'develop'

const RELEASE_NOTES_PATH =
    './src/content/docs/release-notes/new-relic-browser-release-notes/browser-agent-release-notes'

const DOCS_SITE_GITHUB_OWNER = 'newrelic'
const DOCS_SITE_GITHUB_REPO = 'docs-website'

if (!process.env.GITHUB_TOKEN) {
  console.log('NO GITHUB TOKEN FOUND!')
  process.exit(1)
}

const options = yargs(process.argv.slice(2))
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
  .describe('b', `Name of JSON file with targeted browser versions (defaults to ${DEFAULT_BROWSERS_FILE_NAME})`)
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
  .default('dse', DEFAULT_DOCS_SITE_USER_EMAIL)

  .string('dsn')
  .alias('dsn', 'docs-site-name')
  .describe('dsn', 'Name to use when communicating with docs site repo -- git config user.name')
  .default('dsn', DEFAULT_DOCS_SITE_USER_NAME)

  .argv

/**
 * Raises a pull request to the docs website for a new release.
 *
 * @returns {Promise<void>}
 */
async function raiseDocsWebsitePR () {
  console.log(`Script running with following options:\n${JSON.stringify(options)}`)

  try {
    logStep('Parse and validate version')
    const version = options.tag.replace('refs/tags/', '')
    console.log(`Getting version from tag: ${version}`)
    validateVersionTag(version, options.force)

    logStep('Gather details for release notes')
    const { releaseDate, frontMatter, notesBody } = await extractReleaseDetails(version, options.changelog)
    const browserTargetStatement = await getBrowserTargetStatement(version, options.browsersFile)

    logStep('Format release notes markdown')
    const releaseNotes = compileReleaseNotes(releaseDate, version, frontMatter, notesBody, SUPPORT_STATEMENT, browserTargetStatement)

    logStep('Create a branch')
    const branchName = await createBranch(options.repoPath, options.remote, version, options.dryRun, options.docsSiteEmail, options.docsSiteName)

    logStep('Create release notes file')
    await addReleaseNotesFile(releaseNotes, version, options.dryRun)

    logStep('Commit release notes file')
    await commitReleaseNotes(version, branchName, options.dryRun)

    logStep('Create Pull Request')
    await createPR(version, branchName, options.dryRun)

    logStep('Full Run Successful')
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
 * Validates that tag matches the version we want (vX.X.X). If `force` is `true`, ignores a mismatch. Stops execution on error.
 *
 * @param {string} version - Version string to validate.
 * @param {boolean} force Flag to skip validation of tag.
 */
function validateVersionTag (version, force) {
  if (force) {
    console.log('Skipping version validation logic (--force)')
    return
  }

  if (!TAG_VALID_REGEX.exec(version)) {
    console.log('Version tag argument (%s) does not take the valid form v#.#.# (e.g. v7.2.1)', version)
    stopOnError()
  }
}

/**
 * Extracts the relevant changes from the changelog.json.
 *
 * @param {string} version - The new version.
 * @param {string} changelogFilename The name of the JSON file where the change details are stored.
 */
async function extractReleaseDetails (version, changelogFilename) {
  console.log('Extracting release details from change log file:', changelogFilename)

  const data = await fse.readJson(process.cwd() + '/' + options.changelog, 'utf8')

  const versionData = data.entries.find((entry) => entry.version.startsWith(version.substring(1))) // no leading 'v', e.g. 1.234.5 (2030-01-01)

  const releaseDate = new Date(versionData.createTime).toLocaleDateString('sv') // 2 digit format to allow docs-site CI to run correctly
  console.log(`\nExtracting date: ${releaseDate}`)

  const categories = {
    feat: [],
    fix: [],
    security: []
  }

  console.log('\nExtracting commit details')

  const [githubOwner, githubRepo] = data.repository.split('/')
  const github = new Github(githubOwner, githubRepo)
  for (const change of versionData.changes) {
    if (categories[change.type]) {
      const entry = await getEntryContent(github, change.sha) // { title, description }
      console.log(`- ${entry.title}`)
      categories[change.type].push(entry)
    }
  }

  console.log('\nCollecting change entries and front matter')
  const frontMatter = {
    features: [],
    bugs: [],
    security: []
  }
  let notesBody = `## ${version}`
  if (categories.feat.length > 0) {
    notesBody += '\n\n### Features'
    for (const item of categories.feat) {
      frontMatter.features.push(item.title)
      notesBody += `\n\n#### ${item.title}\n${item.description}`
    }
  }
  if (categories.fix.length > 0) {
    notesBody += '\n\n### Bug Fixes'
    for (const item of categories.fix) {
      frontMatter.bugs.push(item.title)
      notesBody += `\n\n#### ${item.title}\n${item.description}`
    }
  }
  if (categories.security.length > 0) {
    notesBody += '\n\n### Security Fixes'
    for (const item of categories.security) {
      frontMatter.security.push(item.title)
      notesBody += `\n\n#### ${item.title}\n${item.description}`
    }
  }

  return { releaseDate, frontMatter, notesBody }
}

/**
 * Retrieves the title and description of a squash-merged commit from its associated pull request.
 *
 * @param {Github} github - An instance of the Github class constructed with the appropriate Github owner and repo.
 * @param {string} commitHash - The SHA-1 hash of the commit to get the description for.
 * @returns {Promise<Object>} A Promise that resolves to the commit title and description, or an empty strings.
 */
async function getEntryContent (github, commitHash) {
  const relatedPR = await github.getAssociatedPR(commitHash)
  const title = relatedPR?.title || ''
  const prBody = relatedPR?.body || ''
  const description = prBody.indexOf('\n---') !== -1 ? prBody.split('\n---')[0].trim() : '<missing>'

  return { title, description }
}

/**
 * Extracts the supported browser versions from the specified JSON file and creates a support string.
 *
 * @param {string} agentVersion The new agent version.
 * @param {string} browsersFile The filename where the supported browsers JSON is stored.
 */
async function getBrowserTargetStatement (agentVersion, browsersFile) {
  console.log('\nRetrieving supported browser targets from file:', browsersFile)

  const browserData = await fse.readJson(process.cwd() + '/' + browsersFile)

  const min = {}
  const max = {}

  for (let browser in browserData) {
    const browserVersions = browserData[browser]
    min[browser] = Infinity
    max[browser] = -Infinity
    for (let browserVersion of browserVersions) {
      const versionNumber = Number(browserVersion.version)
      min[browser] = min[browser] > versionNumber ? versionNumber : min[browser]
      max[browser] = max[browser] < versionNumber ? versionNumber : max[browser]
    }
  }

  return (
    'Consistent with our [browser support policy](https://docs.newrelic.com/docs/browser/new-relic-browser/getting-started/compatibility-requirements-browser-monitoring/#browser-types), ' +
    `version ${agentVersion} of the Browser agent was built for and tested against these browsers and version ranges: ` +
    `Chrome ${min.chrome}-${max.chrome}, Edge ${min.edge}-${max.edge}, Safari ${min.safari}-${max.safari}, Firefox ${min.firefox}-${max.firefox}; ` +
    `and for mobile devices, Android Chrome ${ANDROID_CHROME_VERSION} and iOS Safari ${min.ios}-${max.ios}.`
  )
}

/**
 * Formats the output of the eventual .mdx to adhere to the docs team standards for release notes.
 *
 * @param {string} releaseDate date the release was created
 * @param {string} version version number
 * @param {string} notesBody list of changes
 * @returns {string} appropriately formatted release notes
 */
function compileReleaseNotes (releaseDate, version, frontMatter, notesBody, supportStatement, browserTargetStatement) {
  const releaseNotesFormatted = [
    '---',
    'subject: Browser agent',
    `releaseDate: "${releaseDate}"`,
    `version: ${version.substr(1)}`, // remove the `v` from start of version
    `features: ${JSON.stringify(frontMatter.features)}`,
    `bugs: ${JSON.stringify(frontMatter.bugs)}`,
    `security: ${JSON.stringify(frontMatter.security)}`,
    '---',
    '',
    notesBody,
    '',
    supportStatement,
    '',
    browserTargetStatement
  ].join('\n')

  console.log(chalk.yellow(releaseNotesFormatted))
  return releaseNotesFormatted
}

/**
 * Creates a new branch in a local `docs-website` fork in the pattern `add-browser-agent-<new agent version>`.
 *
 * @param {string} filePath - The file path where the local `docs-website` fork will be cloned.
 * @param {string} remote - The name of the remote repo to push to.
 * @param {string} version - The newest version of the agent (to add a branch for).
 * @param {boolean} dryRun - True if the branch creation should be skipped.
 * @param {string} userEmail - The user's email address to use with git.
 * @param {string} userName - The user's name to use with git.
 * @returns {Promise<string>} A Promise that resolves to the name of the new branch.
 */
async function createBranch (filePath, remote, version, dryRun, userEmail, userName) {
  fse.rmSync(filePath, { recursive: true, force: true })
  fse.mkdirSync(filePath)
  filePath = path.resolve(filePath)
  console.log(`Changing to ${filePath}`)
  process.chdir(filePath)
  const branchName = `add-browser-agent-${version}`
  if (dryRun) {
    console.log(`\nDry run indicated (--dry-run); not creating branch ${branchName}`)
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
    await git.setUserInfo(userEmail, userName)
  }

  return branchName
}

/**
 * Writes the contents of the release notes to the docs-website fork
 *
 * @param {string} body contents of the .mdx
 * @param {string} version version number
 */
async function addReleaseNotesFile (body, version, dryRun) {
  if (dryRun) {
    await fse.ensureDir(RELEASE_NOTES_PATH) // will be missing if it's a dry run
  }
  const FILE = getFileName(version)
  return new Promise((resolve, reject) => {
    fse.writeFile(FILE, body, 'utf8', (writeErr) => {
      if (writeErr) {
        reject(writeErr)
      }

      console.log(`Created new release notes file (${FILE}) in forked repo directory (${options.repoPath})`)
      resolve()
    })
  })
}

function getFileName (version) {
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
    console.log('Dry run indicated (--dry-run); skipping committing release notes')
    return
  }

  console.log(`Adding release notes for ${version}`)
  const files = [getFileName(version)]
  await git.addFiles(files)
  await git.commit(`chore: Add Browser agent ${version} release notes`)
  await git.pushToRemote(branch)
}

/**
 * Creates a PR to the docs website repo with new release notes.
 *
 * @param {string} version - New agent version number.
 * @param {string} branch - Name of GitHub branch.
 * @param {boolean} dryRun - Whether or not we should actually create the PR.
 */
async function createPR (version, branch, dryRun) {
  if (!process.env.GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN required to create a pull request')
    stopOnError()
  }

  const github = new Github(DOCS_SITE_GITHUB_OWNER, DOCS_SITE_GITHUB_REPO)
  const title = `Browser Agent ${version} Release Notes`
  const prOptions = {
    head: `newrelic-forks:${branch}`,
    base: BASE_BRANCH,
    title,
    body: title,
    draft: true
  }

  console.log(`Creating PR with following options: ${JSON.stringify(prOptions)}\n`)

  if (dryRun) {
    console.log('Dry run indicated (--dry-run); skipping creating pull request')
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
 * Tracks the current step as printed and incremented by logStep.
 */
let currentStep = 0

/**
 * Logs a formatted message for the specified step.
 *
 * @param {string} step - The current step of the script.
 */
function logStep (step) {
  currentStep++
  console.log(chalk.cyan.bold(`\n----- [Step ${currentStep}]: ${step} -----\n`))
}

raiseDocsWebsitePR()
