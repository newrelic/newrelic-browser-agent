import process from 'process'
import * as core from '@actions/core'
import * as github from '@actions/github'

const prRequired = process.env['PR_REQUIRED']?.toLowerCase() === 'true'
const octokit = github.getOctokit(process.env['GITHUB_TOKEN'])
const branchName = process.env['GITHUB_REF'].replace('refs/heads/', '')

const { data: pullRequests } = await octokit.rest.pulls.list({
  owner: 'newrelic',
  repo: 'newrelic-browser-agent',
  state: 'open',
  head: `newrelic/newrelic-browser-agent:${branchName}`
})

if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
  if (prRequired) {
    throw new Error(`No pull request found for branch ${branchName} in the newrelic/newrelic-browser-agent repository.`)
  } else {
    core.setOutput('results', JSON.stringify({}))
  }
} else {
  core.setOutput('results', JSON.stringify({
    head: pullRequests[0].head.ref,
    base: pullRequests[0].base.ref,
    number: pullRequests[0].number
  }))
}
