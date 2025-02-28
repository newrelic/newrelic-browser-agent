import fs from 'fs'
import path from 'path'
import url from 'url'
import * as github from '@actions/github'
import { args } from './args.js'
import { cleanTitle, getBrowserVersions } from './utils.js'
import {
  DOCS_CLONE_PATH,
  DOCS_SITE_GITHUB_OWNER,
  DOCS_SITE_GITHUB_REPO,
  DOCS_SITE_REPO_BASE,
  CHANGELOG_FILE_PATH,
  RELEASE_NOTES_PATH,
} from './constants.js'
import { GitCliRunner } from '../shared-utils/git-cli-runner.js'
import Handlebars from 'handlebars'

const octokit = github.getOctokit(args.nrDocsGithubToken)
const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

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
  releaseDate,
  version: args.tag.substr(1),
  downloadLink: "https://www.npmjs.com/package/@newrelic/browser-agent",
  features: [],
  bugs: [],
  security: []
}
const bodyContent = {
  version: args.tag,
  features: [],
  bugs: [],
  security: [],
  browserVersions: {
    ...(await getBrowserVersions())
  }
}

for (const item of categories.feat) {
  frontMatter.features.push(item.title)
  bodyContent.features.push(item)
}
for (const item of categories.fix) {
  frontMatter.bugs.push(item.title)
  bodyContent.bugs.push(item)
}
for (const item of categories.security) {
  frontMatter.security.push(item.title)
  bodyContent.security.push(item)
}

frontMatter.features = JSON.stringify(frontMatter.features)
frontMatter.bugs = JSON.stringify(frontMatter.bugs)
frontMatter.security = JSON.stringify(frontMatter.security)

console.log('Generated release notes:')
console.log(frontMatter)
console.log(bodyContent)
console.log('\n\n')
console.log('##########################')
console.log('# Starting git processes #')
console.log('##########################')

// Setup the directory for the docs website repo
await fs.promises.rm(DOCS_CLONE_PATH, { force: true, recursive: true })
await fs.promises.mkdir(DOCS_CLONE_PATH, { recursive: true })

const branchName = `add-browser-agent-${args.tag}`

try {
  console.log(`Deleting remote branch ${branchName}`)
  await octokit.rest.git.getRef({
    owner: DOCS_SITE_GITHUB_OWNER,
    repo: DOCS_SITE_GITHUB_REPO,
    ref: `heads/${branchName}`
  }) // <-- This will throw an error if the branch does not exist
  await octokit.rest.git.deleteRef({
    owner: DOCS_SITE_GITHUB_OWNER,
    repo: DOCS_SITE_GITHUB_REPO,
    ref: `heads/${branchName}`
  })
} catch (error) {
  if (error.request.method === 'GET' && error.request.url.indexOf('/git/ref/') > -1 && error.status === 404) {
    console.log(`Branch ${branchName} did not exist`)
  } else {
    throw error
  }
}
const gitCliRunner = new GitCliRunner(DOCS_CLONE_PATH, args.githubLogin, args.nrDocsGithubToken, args.githubUserName, args.githubEmail)
await gitCliRunner.clone(DOCS_SITE_GITHUB_OWNER, DOCS_SITE_GITHUB_REPO)
await gitCliRunner.createBranch(branchName)

console.log('Writing release notes file')
const releaseNotesFile = path.join(RELEASE_NOTES_PATH, `browser-agent-${args.tag}.mdx`)
await fs.promises.writeFile(
  path.join(
    DOCS_CLONE_PATH,
    releaseNotesFile
  ),
  Handlebars.compile(await fs.promises.readFile(path.resolve(__dirname, './templates/release-notes.handlebars'), 'utf-8'), { noEscape:true })({ frontMatter, bodyContent }).trim(),
  { encoding: 'utf-8' }
)

console.log('Committing release notes')
await gitCliRunner.commitFile(releaseNotesFile, `chore: Add Browser agent ${args.tag} release notes`)
await gitCliRunner.push(branchName)

console.log('Opening pull request')
await octokit.rest.pulls.create({
  owner: DOCS_SITE_GITHUB_OWNER,
  repo: DOCS_SITE_GITHUB_REPO,
  head: `${DOCS_SITE_GITHUB_OWNER}:${branchName}`,
  head_repo: DOCS_SITE_GITHUB_REPO,
  base: DOCS_SITE_REPO_BASE,
  title: `Browser Agent ${args.tag} Release Notes`,
  body: 'This is an automated PR generated when the Browser agent is released. Please merge as soon as possible.',
  draft: false,
  maintainer_can_modify: true
})
