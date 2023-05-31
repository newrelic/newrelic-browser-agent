import process from 'process'
import * as core from '@actions/core'
import * as github from '@actions/github'

const prRequired = process.env['PR_REQUIRED']?.toLowerCase() === 'true'
const octokit = github.getOctokit(process.env['GITHUB_TOKEN'])
const branchName = process.env['GITHUB_REF'].replace('refs/heads/', '')

const { data: pullRequests } = await octokit.rest.pulls.list({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  state: 'open',
  head: `${github.context.repo.owner}/${github.context.repo.repo}:${branchName}`
})

if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
  if (prRequired) {
    throw new Error(`No pull request found for branch ${branchName} in the ${github.context.repo.owner}/${github.context.repo.repo} repository.`)
  } else {
    core.setOutput('results', null)
  }
} else {
  core.setOutput('results', JSON.stringify({
    head: pullRequests[0].head.ref,
    base: pullRequests[0].base.ref,
    number: pullRequests[0].number
  }))
}
