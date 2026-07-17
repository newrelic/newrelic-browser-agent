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
  'metal-messiah': 'U01UNL890CT',
  'ptang-nr': 'U0263UG8G7Q',
  'cwli24': 'U03H9H8EFLN',
  'ellisong': 'W01A49JUMT9',
}

for (const [login, slackId] of Object.entries(githubToSlack)) {
  if (slackId.startsWith('REPLACE_WITH_SLACK_ID')) {
    console.warn(`No real Slack member ID configured for GitHub user "${login}" - mentions for this user will not notify anyone.`)
  }
}

const escapeSlack = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const mentionFor = (login) => `<@${githubToSlack[login] ?? login}>`
const hasBlockedLabel = (labels) => labels.nodes.some((label) => label.name.toLowerCase() === 'blocked')

const headerBlock = (text) => ({ type: 'header', text: { type: 'plain_text', text, emoji: true } })
const sectionBlock = (text) => ({ type: 'section', text: { type: 'mrkdwn', text } })
const contextBlock = (text) => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] })
const dividerBlock = () => ({ type: 'divider' })

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
            createdAt
            headRefName
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
            commits(last: 1) {
              nodes {
                commit {
                  committedDate
                }
              }
            }
            timelineItems(last: 100, itemTypes: [PULL_REQUEST_REVIEW, ISSUE_COMMENT, PULL_REQUEST_REVIEW_THREAD]) {
              nodes {
                __typename
                ... on PullRequestReview {
                  author {
                    login
                  }
                  createdAt
                }
                ... on IssueComment {
                  author {
                    login
                  }
                  createdAt
                }
                ... on PullRequestReviewThread {
                  comments(first: 1) {
                    nodes {
                      author {
                        login
                      }
                      createdAt
                    }
                  }
                }
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

// Filter and sort PRs needing review, oldest first
const needsReview = prs
  .filter((pr) => !pr.isDraft && !hasBlockedLabel(pr.labels) && pr.reviewDecision !== 'APPROVED')
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

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

// Fetch merged PRs from the last 30 days for mean-time-to-merge.
// Pull requests can only be ordered by CREATED_AT/UPDATED_AT via the GraphQL API (no MERGED_AT),
// so we sample the most recently updated ~200 merged PRs and filter client-side by mergedAt.
// This is a bounded sample, not an exhaustive count, for repos with very high merge volume.
const mttmCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const mergedPRs = []
let mergedCursor = null
let mergedPages = 0

do {
  const response = await octokit.graphql(`
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: MERGED, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            createdAt
            mergedAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `, { owner, repo, cursor: mergedCursor })

  const connection = response.repository.pullRequests
  mergedPRs.push(...connection.nodes)
  mergedPages++
  mergedCursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null
} while (mergedCursor && mergedPages < 2)

const mttmSample = mergedPRs.filter((pr) => new Date(pr.mergedAt) >= mttmCutoff)
const mttmHours = mttmSample.length > 0
  ? mttmSample.reduce((sum, pr) => sum + (new Date(pr.mergedAt) - new Date(pr.createdAt)), 0) / mttmSample.length / (1000 * 60 * 60)
  : null

const formatDuration = (hours) => {
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  if (days === 0) return `${remainingHours}h`
  return `${days}d ${remainingHours}h`
}

// Fetch workflow runs from the last 24 hours
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const workflowRuns = await octokit.rest.actions.listWorkflowRunsForRepo({
  owner,
  repo,
  created: `>=${yesterday}`,
  per_page: 100
})

const allRuns = workflowRuns.data.workflow_runs
const failedRuns = allRuns.filter((run) => run.conclusion === 'failure')

// Drop failed runs that were superseded by a later successful run on the same
// workflow + branch (e.g. a follow-up push fixed the failure).
const isSupersededBySuccess = (failedRun) => allRuns.some((other) =>
  other.workflow_id === failedRun.workflow_id &&
  other.head_branch === failedRun.head_branch &&
  new Date(other.created_at) > new Date(failedRun.created_at) &&
  other.conclusion === 'success'
)

const activeFailedRuns = failedRuns.filter((run) => !isSupersededBySuccess(run))

const linkForBranch = (branch) => {
  const matchingPR = prs.find((pr) => pr.headRefName === branch)
  if (matchingPR) return `<${matchingPR.url}|#${matchingPR.number} ${escapeSlack(matchingPR.title)}>`
  return `<https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}|${escapeSlack(branch)}>`
}

// Build the daily dispatch Slack Block Kit payload
const blocks = []
const textLines = ['Browser Agent Daily Dispatch']

blocks.push(headerBlock('🌅 Browser Agent Daily Dispatch'))
blocks.push(dividerBlock())

// Version Status
let versionText = `*📦 Version Status*\nThe Browser Agent is currently on version *${currentVersion}*`
textLines.push(`Version Status: currently on ${currentVersion}`)

if (releasePR) {
  const versionMatch = releasePR.title.match(/(\d+\.\d+\.\d+)/)
  const nextVersion = versionMatch ? versionMatch[1] : 'TBD'

  const bodyLines = (releasePR.body || '').split('\n')
  const changeLines = bodyLines
    .filter((line) => line.trim().startsWith('*'))
    .slice(0, 10) // Limit to first 10 changes
    .map((line) => {
      // Strip everything after the first closing paren to remove issue/commit links
      // "* Improve agent startup ([#1760](...)) ([d75f4bf](...))" -> "* Improve agent startup"
      const cleaned = line.replace(/\s*\([#\[].*$/, '').trim()
      return '  ' + cleaned
    })

  versionText += ` with version *${nextVersion}* slated for next release (<${releasePR.url}|#${releasePR.number}>)${changeLines.length > 0 ? ', adding the following:' : '.'}`
  if (changeLines.length > 0) {
    versionText += '\n' + changeLines.join('\n')
  }
  textLines.push(`Next release: ${nextVersion} (#${releasePR.number})`)
} else {
  versionText += '\nNo release is currently staged.'
}

blocks.push(sectionBlock(versionText))
blocks.push(dividerBlock())

// PRs Needing Review
if (needsReview.length === 0) {
  blocks.push(sectionBlock('*👀 PRs Needing Review*\n✅ No open PRs currently need review.'))
  textLines.push('PRs Needing Review: none')
} else {
  blocks.push(sectionBlock(`*👀 PRs Needing Review*\n${needsReview.length} PR${needsReview.length === 1 ? '' : 's'} awaiting review, oldest first:`))
  textLines.push(`PRs Needing Review: ${needsReview.length}`)

  const maxDetailed = 12
  for (const pr of needsReview.slice(0, maxDetailed)) {
    const assignees = pr.assignees.nodes.map((assignee) => assignee.login)
    const authorLogin = pr.author?.login

    // Find the most recent comment/review from a non-author
    const reviewerActivity = pr.timelineItems.nodes
      .flatMap((item) => {
        if (item.author?.login && item.author.login !== authorLogin && item.createdAt) {
          return [new Date(item.createdAt)]
        }
        if (item.__typename === 'PullRequestReviewThread' && item.comments?.nodes) {
          return item.comments.nodes
            .filter((comment) => comment.author?.login && comment.author.login !== authorLogin)
            .map((comment) => new Date(comment.createdAt))
        }
        return []
      })
      .sort((a, b) => b - a)[0]

    const lastCommitDate = pr.commits.nodes.length > 0
      ? new Date(pr.commits.nodes[0].commit.committedDate)
      : null

    const hasUnaddressedFeedback = reviewerActivity && (!lastCommitDate || lastCommitDate <= reviewerActivity)

    const prLink = `<${pr.url}|#${pr.number} ${escapeSlack(pr.title)}>`

    let prText
    if (assignees.length > 0) {
      const assigneeMentions = assignees.filter((login) => login !== authorLogin).map(mentionFor)
      prText = assigneeMentions.length > 0
        ? `${prLink}\n*Assigned to:*\n${assigneeMentions.join('\n')}`
        : prLink
    } else {
      const availableReviewers = Object.keys(githubToSlack).filter((login) => login !== authorLogin).map(mentionFor).join(' ')
      prText = `${prLink}\n*🔴 No assignees yet. ${availableReviewers} Please take a look and assign yourself.*`
    }
    blocks.push(sectionBlock(prText))

    const createdDate = new Date(pr.createdAt)
    const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const prAgeHours = (Date.now() - createdDate) / (1000 * 60 * 60)
    const ageIndicator = mttmHours === null ? '' : (prAgeHours <= mttmHours ? '🟢 ' : '🔴 ')

    let statusText = `${ageIndicator}Open since ${formattedDate}`
    if (hasUnaddressedFeedback) {
      statusText += ` • 🟠 This PR has been reviewed without new commits, ${authorLogin ? mentionFor(authorLogin) : 'author'} please take a look.`
    } else if (reviewerActivity) {
      // Only reachable when reviewerActivity is truthy, i.e. there is at least one reviewer comment.
      statusText += ' • 🟠 has new commits since the last reviewer comment'
    } else {
      statusText += ' • no review activity yet'
    }
    blocks.push(contextBlock(statusText))
    blocks.push(dividerBlock())
  }

  if (needsReview.length > maxDetailed) {
    blocks.push(contextBlock(`_...and ${needsReview.length - maxDetailed} more PR${needsReview.length - maxDetailed === 1 ? '' : 's'} awaiting review_`))
    blocks.push(dividerBlock())
  }
}

// Mean Time to Merge
let mttmText = '*⏱️ Mean Time to Merge (Last 30 Days)*\n'
if (mttmHours === null) {
  mttmText += 'No PRs merged in the last 30 days.'
} else {
  mttmText += `Average of *${formatDuration(mttmHours)}* across ${mttmSample.length} merged PR${mttmSample.length === 1 ? '' : 's'}.`
}
blocks.push(sectionBlock(mttmText))
blocks.push(dividerBlock())

// Failed Workflows
if (activeFailedRuns.length === 0) {
  blocks.push(sectionBlock('*⚠️ Failed Workflows (Last 24 Hours)*\n✅ All workflows passing!'))
  textLines.push('Failed Workflows: none')
} else {
  blocks.push(sectionBlock(`*⚠️ Failed Workflows (Last 24 Hours)*\n${activeFailedRuns.length} workflow${activeFailedRuns.length === 1 ? '' : 's'} failed:`))
  for (const run of activeFailedRuns.slice(0, 10)) { // Limit to 10 most recent
    blocks.push(sectionBlock(`${linkForBranch(run.head_branch)} — <${run.html_url}|${escapeSlack(run.name)}>`))
  }
  textLines.push(`Failed Workflows: ${activeFailedRuns.length}`)
}
blocks.push(dividerBlock())

// Open Issues
if (issues.length === 0) {
  blocks.push(sectionBlock('*🐛 Open Issues*\n✅ No open issues!'))
  textLines.push('Open Issues: none')
} else {
  const maxIssuesShown = 15
  blocks.push(sectionBlock(`*🐛 Open Issues*\n${issues.length} open issue${issues.length === 1 ? '' : 's'}:`))
  for (const issue of issues.slice(0, maxIssuesShown)) {
    blocks.push(sectionBlock(`<${issue.url}|#${issue.number} ${escapeSlack(issue.title)}>`))
  }
  if (issues.length > maxIssuesShown) {
    blocks.push(contextBlock(`_...and ${issues.length - maxIssuesShown} more_`))
  }
  textLines.push(`Open Issues: ${issues.length}`)
}

console.log(JSON.stringify({ text: textLines.join(' | '), blocks }))
