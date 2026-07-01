import * as github from '@actions/github'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const githubToken = process.env.GITHUB_TOKEN

if (!githubToken) {
  throw new Error('GITHUB_TOKEN environment variable is required')
}

const owner = github.context.repo.owner
const repo = github.context.repo.repo
const octokit = github.getOctokit(githubToken)

const githubToSlack = {
  'metal-messiah': '@jporter',
  'ptang-nr': '@ptang',
  'cwli24': '@cli',
  'ellisong': '@gellison',
}

const escapeSlack = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const mentionFor = (login) => githubToSlack[login] ?? `@${login}`
const hasBlockedLabel = (labels) => labels.nodes.some((label) => label.name.toLowerCase() === 'blocked')

// Get current version from package.json
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
const currentVersion = packageJson.version

// Fetch all open PRs
const prs = []
let cursor = null

do {
  const response = await octokit.graphql(`
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: OPEN, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            isDraft
            reviewDecision
            author {
              login
            }
            labels(first: 100) {
              nodes {
                name
              }
            }
            assignees(first: 100) {
              nodes {
                login
              }
            }
            body
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `, { owner, repo, cursor })

  const connection = response.repository.pullRequests
  prs.push(...connection.nodes)
  cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null
} while (cursor)

// Find release-please PR
const releasePR = prs.find((pr) => 
  pr.labels.nodes.some((label) => label.name === 'autorelease: pending') ||
  pr.title.toLowerCase().includes('release-please')
)

// Filter PRs needing review
const needsReview = prs.filter((pr) => !pr.isDraft && !hasBlockedLabel(pr.labels) && pr.reviewDecision !== 'APPROVED')

// Fetch open issues
const issues = []
let issueCursor = null

do {
  const response = await octokit.graphql(`
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, states: OPEN, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            labels(first: 100) {
              nodes {
                name
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `, { owner, repo, cursor: issueCursor })

  const connection = response.repository.issues
  issues.push(...connection.nodes)
  issueCursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null
} while (issueCursor)

// Fetch workflow runs from the last 24 hours
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const workflowRuns = await octokit.rest.actions.listWorkflowRunsForRepo({
  owner,
  repo,
  created: `>=${yesterday}`,
  per_page: 100
})

const failedRuns = workflowRuns.data.workflow_runs.filter((run) => run.conclusion === 'failure')

// Build the daily dispatch message
const lines = ['*🌅 Browser Agent Daily Dispatch*', '']

// Version Information
lines.push('*📦 Version Status*')
lines.push(`The Browser Agent is currently on version *${currentVersion}*`)

if (releasePR) {
  // Extract version from PR title (usually "chore: release X.X.X" or similar)
  const versionMatch = releasePR.title.match(/(\d+\.\d+\.\d+)/)
  const nextVersion = versionMatch ? versionMatch[1] : 'TBD'
  
  // Extract changes from PR body
  const bodyLines = (releasePR.body || '').split('\n')
  const changeLines = bodyLines
    .filter((line) => line.trim().startsWith('*') || line.trim().startsWith('-'))
    .slice(0, 10) // Limit to first 10 changes
    .map((line) => '  ' + line.trim())
  
  lines.push(`with version *${nextVersion}* slated for next release${changeLines.length > 0 ? ', adding the following:' : '.'}`)
  if (changeLines.length > 0) {
    lines.push(...changeLines)
  }
} else {
  lines.push('No release is currently staged.')
}

lines.push('')

// Failed Workflows
lines.push('*⚠️ Failed Workflows (Last 24 Hours)*')
if (failedRuns.length === 0) {
  lines.push('✅ All workflows passing!')
} else {
  lines.push(`${failedRuns.length} workflow${failedRuns.length === 1 ? '' : 's'} failed:`)
  for (const run of failedRuns.slice(0, 10)) { // Limit to 10 most recent
    lines.push(`- <${run.html_url}|${escapeSlack(run.name)}> on branch \`${run.head_branch}\``)
  }
}

lines.push('')

// PRs Needing Review
lines.push('*👀 PRs Needing Review*')
if (needsReview.length === 0) {
  lines.push('✅ No open PRs currently need review.')
} else {
  lines.push(`${needsReview.length} PR${needsReview.length === 1 ? '' : 's'} awaiting review:`)
  for (const pr of needsReview) {
    const assignees = pr.assignees.nodes.map((assignee) => assignee.login)
    const authorLogin = pr.author?.login
    
    let mentions
    if (assignees.length > 0) {
      // If there are assignees, tag them (excluding the author)
      mentions = assignees
        .filter((login) => login !== authorLogin)
        .map(mentionFor)
        .join(' ')
    } else {
      // If no assignees, tag everyone except the author
      mentions = Object.keys(githubToSlack)
        .filter((login) => login !== authorLogin)
        .map(mentionFor)
        .join(' ')
    }

    lines.push(`- ${mentions} <${pr.url}|#${pr.number} ${escapeSlack(pr.title)}>`)
    
    if (assignees.length === 0) {
      lines.push('  _No assignees yet. Please take a look and assign yourself._')
    }
  }
}

lines.push('')

// Open Issues
lines.push('*🐛 Open Issues*')
if (issues.length === 0) {
  lines.push('✅ No open issues!')
} else {
  lines.push(`${issues.length} open issue${issues.length === 1 ? '' : 's'}:`)
  for (const issue of issues.slice(0, 15)) { // Limit to 15 most recent
    lines.push(`- <${issue.url}|#${issue.number} ${escapeSlack(issue.title)}>`)
  }
  if (issues.length > 15) {
    lines.push(`_...and ${issues.length - 15} more_`)
  }
}

console.log(lines.join('\n'))
