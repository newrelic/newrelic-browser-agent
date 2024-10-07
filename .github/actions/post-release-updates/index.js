import os from 'os'
import * as github from '@actions/github'
import { args } from './args.js'
import {
  REPO_ROOT_PATH,
  DEFAULT_SPAWN_OPTIONS,
  PR_BRANCH_NAME,
  GITHUB_OWNER,
  GITHUB_REPO,
  REPO_BASE,
  COMMIT_MESSAGE,
  PR_BODY
} from './constants.js'
import { spawnAsync } from '../shared-utils/child-process.js'
import { GitCliRunner } from '../shared-utils/git-cli-runner.js'

let octokit
let gitRunner

if (args.openPullRequest) {
  console.log('#############################')
  console.log('# Setting up git repository #')
  console.log('#############################')

  octokit = github.getOctokit(args.githubToken)

  try {
    console.log(`Deleting remote branch ${PR_BRANCH_NAME}`)
    await octokit.rest.git.getRef({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      ref: `heads/${PR_BRANCH_NAME}`
    }) // <-- This will throw an error if the branch does not exist
    await octokit.rest.git.deleteRef({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      ref: `heads/${PR_BRANCH_NAME}`
    })
  } catch (error) {
    if (error.request.method === 'GET' && error.request.url.indexOf('/git/ref/') > -1 && error.status === 404) {
      console.log(`Branch ${PR_BRANCH_NAME} did not exist`)
    } else {
      throw error
    }
  }

  gitRunner = new GitCliRunner(REPO_ROOT_PATH, args.githubLogin, args.githubToken, args.githubUserName, args.githubEmail)
  await gitRunner.setUser()
  await gitRunner.checkoutBranch(REPO_BASE, true)
  try {
    await gitRunner.deleteLocalBranch(PR_BRANCH_NAME)
  } catch (error) {
    // Ignore error thrown when branch does not exist locally
  }
  await gitRunner.createBranch(PR_BRANCH_NAME)
}


console.log('#############################')
console.log('# Running update scripts    #')
console.log('#############################')


console.log('\nInstalling project dependencies')
await spawnAsync(
  `npm${os.platform() === 'win32' ? '.cmd' : ''}`,
  [ 'ci', '--no-progress', '--silent' ],
  DEFAULT_SPAWN_OPTIONS
)

console.log('\nUpdating browserslist database')
await spawnAsync(
  `npx${os.platform() === 'win32' ? '.cmd' : ''}`,
  [ '--yes', 'browserslist@latest', '--update-db' ],
  DEFAULT_SPAWN_OPTIONS
)

console.log('Updating LambdaTest browsers lists')
await spawnAsync(
  `npm${os.platform() === 'win32' ? '.cmd' : ''}`,
  ['run', 'lt:update-browsers'],
  DEFAULT_SPAWN_OPTIONS
)

console.log('Updating LambdaTest browsers lists')
await spawnAsync(
  `npm${os.platform() === 'win32' ? '.cmd' : ''}`,
  ['run', 'lt:upload-webview-assets'],
  DEFAULT_SPAWN_OPTIONS
)

console.log('Updating third-party licenses')
await spawnAsync(
  `npm${os.platform() === 'win32' ? '.cmd' : ''}`,
  [ 'run', 'third-party-updates' ],
  DEFAULT_SPAWN_OPTIONS
)

console.log('#############################')
console.log('# Rebuilding Test Projects  #')
console.log('#############################')
await spawnAsync(
  `npm${os.platform() === 'win32' ? '.cmd' : ''}`,
  [ 'run', 'build:all' ],
  DEFAULT_SPAWN_OPTIONS
)


if (args.openPullRequest) {
  console.log('#############################')
  console.log('# Pushing browser updates   #')
  console.log('#############################')

  await gitRunner.commitFiles(
    [
      'package.json',
      'package-lock.json',
      'tools/browsers-lists/*.json',
      'third_party_manifest.json',
      'THIRD_PARTY_NOTICES.md',
      'tools/test-builds/**/package.json',
      'tools/lambda-test/webview-asset-ids.js'
    ],
    COMMIT_MESSAGE,
    true
  )
  await gitRunner.push(PR_BRANCH_NAME, true)

  console.log('Opening pull request')
  await octokit.rest.pulls.create({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    head: `${GITHUB_OWNER}:${PR_BRANCH_NAME}`,
    head_repo: GITHUB_REPO,
    base: REPO_BASE,
    title: COMMIT_MESSAGE,
    body: PR_BODY,
    draft: false
  })
}
