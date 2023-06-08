import process from 'process'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { args } from './args.js'

const octokit = github.getOctokit(args.githubToken)
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

const { data: pullRequest } = await octokit.rest.pulls.get({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  pull_number: pullRequests[0].number
})

if (!(pullRequest?.mergeable)) {
  errorResult(`Pull request found for branch ${branchName} contains merge conflicts.`)
}

core.setOutput('results', JSON.stringify({
  head_ref: pullRequests[0].head.ref,
  head_sha: pullRequests[0].head.sha,
  base_ref: pullRequests[0].base.ref,
  base_sha: pullRequests[0].base.sha,
  pr_number: pullRequests[0].number
}))

function errorResult(errorMessage) {
  if (args.prRequired) {
    throw new Error(errorMessage)
  } else {
    core.setOutput('results', null)
    process.exit(0)
  }
}
