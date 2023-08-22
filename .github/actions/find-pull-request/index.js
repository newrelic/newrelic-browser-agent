import process from 'process'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { args } from './args.js'

console.log(args.githubRef)

if (args.githubRef.startsWith('refs/tags/')) {
  errorResult('Tags cannot have associated pull requests.')
}

const octokit = github.getOctokit(args.githubToken)
let pullNumber

if (args.githubRef.startsWith('refs/heads/')) {
  const branchName = args.githubRef.replace('refs/heads/', '')

  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: 'open',
    head: `${github.context.repo.owner}/${github.context.repo.repo}:${branchName}`
  })

  if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
    errorResult(`No pull request found for branch ${branchName}.`)
  }

  pullNumber = pullRequests[0].number
}

if (args.githubRef.startsWith('refs/pull/')) {
  pullNumber = args.githubRef.split('/')[2]
  console.log(pullNumber)
}

const { data: pullRequest } = await octokit.rest.pulls.get({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  pull_number: pullNumber
})

if (!(pullRequest?.mergeable)) {
  errorResult(`Pull request found for ref ${args.githubRef} contains merge conflicts.`)
}

core.setOutput('results', JSON.stringify({
  head_ref: pullRequest.head.ref,
  head_sha: pullRequest.head.sha,
  base_ref: pullRequest.base.ref,
  base_sha: pullRequest.base.sha,
  pr_number: pullRequest.number
}))

function errorResult(errorMessage) {
  if (args.prRequired) {
    throw new Error(errorMessage)
  } else {
    core.setOutput('results', null)
    process.exit(0)
  }
}
