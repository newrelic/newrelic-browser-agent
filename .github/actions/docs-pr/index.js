import fs from 'fs'
import path from 'path'
import * as github from '@actions/github'
import { args } from './args.js'
import { cleanTitle, getBrowserTargetStatement } from './utils.js'
import {
  DOCS_FORK_CLONE_PATH,
  DOCS_SITE_GITHUB_OWNER,
  DOCS_SITE_GITHUB_REPO,
  DOCS_SITE_REPO_BASE,
  DOCS_SITE_FORK_GITHUB_OWNER,
  DOCS_SITE_FORK_GITHUB_REPO,
  CHANGELOG_FILE_PATH,
  SUPPORT_STATEMENT,
  RELEASE_NOTES_PATH
} from './constants.js'
import { GitCliRunner } from './git-cli-runner.js'

const octokit = github.getOctokit(args.githubToken)

// Get the release change log
const versionData = JSON.parse(await fs.promises.readFile(CHANGELOG_FILE_PATH)).entries.find(
  entry => entry.version === args.tag.substring(1)
)
const releaseDate = new Date(versionData.createTime).toLocaleDateString('sv') // 2 digit format to allow docs-site CI to run correctly

// Retrieve and categorize each change in the release
const categories = {
  feat: [],
  fix: [],
  security: []
}
for (const change of versionData.changes) {
  if (categories[change.type]) {
    const entries = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      commit_sha: change.sha
    })

    const title = cleanTitle(entries?.data[0]?.title || '')
    const prBody = entries?.data[0]?.body || ''

    categories[change.type].push({
      ...entries.data[0],
      title,
      description: prBody.indexOf('\n---') !== -1 ? prBody.split('\n---')[0].trim() : '<missing>'
    })
  }
}

// Build out the front matter for the release doc
const frontMatter = {
  features: [],
  bugs: [],
  security: []
}
let notesBody = `## ${args.tag}`
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

// Compile release note markdown
const releaseNotesFormatted = [
  '---',
  'subject: Browser agent',
  `releaseDate: "${releaseDate}"`,
  `version: ${args.tag.substr(1)}`, // remove the `v` from start of version
  `features: ${JSON.stringify(frontMatter.features)}`,
  `bugs: ${JSON.stringify(frontMatter.bugs)}`,
  `security: ${JSON.stringify(frontMatter.security)}`,
  '---',
  '',
  notesBody,
  '',
  SUPPORT_STATEMENT,
  '',
  await getBrowserTargetStatement(args.tag)
].join('\n')

console.log('Generated release notes:')
console.log(releaseNotesFormatted)
console.log('\n\n')
console.log('##########################')
console.log('# Starting git processes #')
console.log('##########################')

// Setup the directory for the docs website repo
await fs.promises.rm(DOCS_FORK_CLONE_PATH, { force: true, recursive: true })
await fs.promises.mkdir(DOCS_FORK_CLONE_PATH, { recursive: true })

const branchName = `add-browser-agent-${args.tag}-test`

console.log('Syncing docs fork')
await octokit.rest.repos.mergeUpstream({
  owner: DOCS_SITE_FORK_GITHUB_OWNER,
  repo: DOCS_SITE_FORK_GITHUB_REPO,
  branch: DOCS_SITE_REPO_BASE
})

try {
  console.log(`Deleting remote branch ${branchName}`)
  await octokit.rest.git.getRef({
    owner: DOCS_SITE_FORK_GITHUB_OWNER,
    repo: DOCS_SITE_FORK_GITHUB_REPO,
    ref: `heads/${branchName}`
  }) // <-- This will throw an error if the branch does not exist
  await octokit.rest.git.deleteRef({
    owner: DOCS_SITE_FORK_GITHUB_OWNER,
    repo: DOCS_SITE_FORK_GITHUB_REPO,
    ref: `heads/${branchName}`
  })
} catch (error) {
  if (error.request.method === 'GET' && error.request.url.indexOf('/git/ref/') > -1 && error.status === 404) {
    console.log(`Branch ${branchName} did not exist`)
  } else {
    throw error
  }
}
const gitCliRunner = new GitCliRunner(DOCS_FORK_CLONE_PATH, args.githubLogin, args.githubToken, args.githubUserName, args.githubEmail)
await gitCliRunner.clone(DOCS_SITE_FORK_GITHUB_OWNER, DOCS_SITE_FORK_GITHUB_REPO)
await gitCliRunner.createBranch(branchName)

console.log('Writing release notes file')
const releaseNotesFile = path.join(RELEASE_NOTES_PATH, `browser-agent-${args.tag}.mdx`)
await fs.promises.writeFile(
  path.join(
    DOCS_FORK_CLONE_PATH,
    releaseNotesFile
  ),
  releaseNotesFormatted,
  { encoding: 'utf-8' }
)

console.log('Committing release notes')
await gitCliRunner.commitFile(releaseNotesFile, `chore: Add Browser agent ${args.tag} release notes`)
await gitCliRunner.push(branchName)

console.log('Opening pull request')
await octokit.rest.pulls.create({
  owner: DOCS_SITE_GITHUB_OWNER,
  repo: DOCS_SITE_GITHUB_REPO,
  head: `${DOCS_SITE_FORK_GITHUB_OWNER}:${branchName}`,
  head_repo: DOCS_SITE_FORK_GITHUB_REPO,
  base: DOCS_SITE_REPO_BASE,
  title: `Browser Agent ${args.tag} Release Notes`,
  body: 'This is an automated PR generated when the Browser agent is released. Please merge as soon as possible.',
  draft: false
})
