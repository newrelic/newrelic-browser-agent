import * as core from '@actions/core'
import * as github from '@actions/github'
import { args } from './args.js'

const octokit = github.getOctokit(args.githubToken)

const { data: workflowRun } = await octokit.rest.actions.getWorkflowRun({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  run_id: args.runId
})

const { data: workflowRunJobs } = await octokit.rest.actions.listJobsForWorkflowRun({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  run_id: args.runId
})

console.log(workflowRunJobs)

// if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
//   if (args.prRequired) {
//     throw new Error(`No pull request found for branch ${branchName} in the ${github.context.repo.owner}/${github.context.repo.repo} repository.`)
//   } else {
//     core.setOutput('results', null)
//   }
// } else {
//   core.setOutput('results', JSON.stringify({
//     head_ref: pullRequests[0].head.ref,
//     head_sha: pullRequests[0].head.sha,
//     base_ref: pullRequests[0].base.ref,
//     base_sha: pullRequests[0].base.sha,
//     pr_number: pullRequests[0].number
//   }))
// }
