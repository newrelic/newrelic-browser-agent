import * as github from '@actions/github'
import { readFileSync, appendFileSync } from 'node:fs'
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

// Only comments/reviews from our tracked engineers count as "reviewer activity" -
// bot/team/other-contributor activity shouldn't drive messaging or metrics.
const isTrackedReviewer = (login, authorLogin) => !!login && login !== authorLogin && login in githubToSlack

const reviewerCommentEvents = (pr) => pr.timelineItems.nodes.flatMap((item) => {
  const authorLogin = pr.author?.login
  if (isTrackedReviewer(item.author?.login, authorLogin) && item.createdAt) {
    return [new Date(item.createdAt)]
  }
  if (item.__typename === 'PullRequestReviewThread' && item.comments?.nodes) {
    return item.comments.nodes
      .filter((comment) => isTrackedReviewer(comment.author?.login, authorLogin))
      .map((comment) => new Date(comment.createdAt))
  }
  return []
})

// Renders one PR-list section (title, PR links, assignee/age/status context lines).
// `statusSuffix(pr)` returns the bucket-specific trailing note for the context line, or ''.
const renderPrSection = (blocks, textLines, { emoji, title, prList, emptyText, mttmHours, statusSuffix, showCount = true }) => {
  if (prList.length === 0) {
    blocks.push(sectionBlock(`*${emoji} ${title}*\n${emptyText}`))
    textLines.push(`${title}: none`)
    blocks.push(dividerBlock())
    return
  }

  const header = showCount ? `*${emoji} ${title}*\n${prList.length} PR${prList.length === 1 ? '' : 's'}, oldest first:` : `*${emoji} ${title}*`
  blocks.push(sectionBlock(header))
  textLines.push(`${title}: ${prList.length}`)

  // Capped low, and one Slack block per PR (not two), to keep the overall payload
  // comfortably under Slack's 50-block-per-message limit now that PRs are split
  // across four sections instead of one.
  const maxDetailed = 6
  for (const pr of prList.slice(0, maxDetailed)) {
    const assignees = pr.assignees.nodes.map((assignee) => assignee.login)
    const authorLogin = pr.author?.login

    const prLink = `<${pr.url}|#${pr.number} ${escapeSlack(pr.title)}>`
    const assigneeMentions = assignees.filter((login) => login !== authorLogin).map(mentionFor)

    let prText
    if (assignees.length > 0) {
      prText = assigneeMentions.length > 0
        ? `${prLink}\n*Assigned to:* ${assigneeMentions.join(' ')}`
        : prLink
    } else {
      const availableReviewers = Object.keys(githubToSlack).filter((login) => login !== authorLogin).map(mentionFor).join(' ')
      prText = `${prLink}\n${availableReviewers} please take a look.`
    }

    const createdDate = new Date(pr.createdAt)
    const formattedDate = createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const prAgeHours = (Date.now() - createdDate) / (1000 * 60 * 60)
    const ageIndicator = mttmHours === null ? '' : (prAgeHours <= mttmHours ? '🟢 ' : '🔴 ')

    let statusText = `${ageIndicator}Open since ${formattedDate}`
    statusText += statusSuffix(pr, assigneeMentions)
    if (assignees.length === 0) {
      statusText += ' • 🔴 No assignees yet'
    }

    blocks.push(sectionBlock(`${prText}\n_${statusText}_`))
  }
  blocks.push(dividerBlock())

  if (prList.length > maxDetailed) {
    blocks.push(contextBlock(`_...and ${prList.length - maxDetailed} more_`))
    blocks.push(dividerBlock())
  }
}

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
            authorAssociation
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
            commits(last: 100) {
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

// External contributors (not org members/owners/collaborators) get their own
// section - everyone else is bucketed by where they sit in the review cycle.
//
// authorAssociation is under-reported (falls back to CONTRIBUTOR/NONE instead of
// MEMBER) when the querying token can't see the author's org membership - which is
// the case for the default GITHUB_TOKEN and any maintainer whose org membership is
// private. Treat anyone we already track as a reviewer as internal regardless of
// what authorAssociation reports, since that quirk only ever under-reports membership.
const knownInternalLogins = new Set(Object.keys(githubToSlack))
const isExternal = (pr) => !knownInternalLogins.has(pr.author?.login) && !['MEMBER', 'OWNER', 'COLLABORATOR'].includes(pr.authorAssociation)
const byCreatedAtAsc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)

// The release-please PR is release automation, not a contributor PR to review -
// it's already covered by the Version Status section, so keep it out of all four buckets.
const eligible = prs.filter((pr) => pr !== releasePR && !pr.isDraft && !hasBlockedLabel(pr.labels) && pr.reviewDecision !== 'APPROVED')
const externalPrs = eligible.filter(isExternal).sort(byCreatedAtAsc)
const internalPrs = eligible.filter((pr) => !isExternal(pr))

const reviewState = (pr) => {
  const reviewerActivity = reviewerCommentEvents(pr).sort((a, b) => b - a)[0]
  const lastCommitDate = pr.commits.nodes.length > 0
    ? new Date(pr.commits.nodes[pr.commits.nodes.length - 1].commit.committedDate)
    : null

  if (!reviewerActivity) return 'neverReviewed'
  if (!lastCommitDate || lastCommitDate <= reviewerActivity) return 'needsRevisions'
  return 'needsReReview'
}

const neverReviewed = internalPrs.filter((pr) => reviewState(pr) === 'neverReviewed').sort(byCreatedAtAsc)
const needsRevisions = internalPrs.filter((pr) => reviewState(pr) === 'needsRevisions').sort(byCreatedAtAsc)
const needsReReview = internalPrs.filter((pr) => reviewState(pr) === 'needsReReview').sort(byCreatedAtAsc)

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

// Fetch repo stats and per-environment deployment history in one shot
const deploymentEnvironments = ['nr1-dev', 'nr1-staging', 'nr1-us-prod', 'nr1-eu-prod', 'nr1-jp-prod', 'public-release']

const repoStatsAndDeploysQuery = `
  query($owner: String!, $repo: String!, ${deploymentEnvironments.map((_, i) => `$env${i}: [String!]`).join(', ')}) {
    repository(owner: $owner, name: $repo) {
      stargazerCount
      forkCount
      watchers { totalCount }
      ${deploymentEnvironments.map((_, i) => `
      env${i}: deployments(environments: $env${i}, first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          createdAt
          commit { oid }
          statuses(first: 10) {
            nodes { state createdAt }
          }
        }
      }`).join('\n')}
    }
  }
`

const repoStatsAndDeploysVars = { owner, repo }
deploymentEnvironments.forEach((env, i) => { repoStatsAndDeploysVars[`env${i}`] = [env] })

const repoStatsAndDeploysResponse = await octokit.graphql(repoStatsAndDeploysQuery, repoStatsAndDeploysVars)

let npmWeeklyDownloads = null
try {
  const npmWeeklyDownloadsResponse = await fetch(`https://api.npmjs.org/downloads/point/last-week/${packageJson.name}`)
  if (npmWeeklyDownloadsResponse.ok) {
    npmWeeklyDownloads = (await npmWeeklyDownloadsResponse.json()).downloads
  }
} catch (error) {
  console.warn(`Failed to fetch npm weekly downloads: ${error.message}`)
}

const repoStats = {
  stars: repoStatsAndDeploysResponse.repository.stargazerCount,
  forks: repoStatsAndDeploysResponse.repository.forkCount,
  watchers: repoStatsAndDeploysResponse.repository.watchers.totalCount,
  npmWeeklyDownloads,
}

// A deployment's `latestStatus` goes INACTIVE once a newer deployment supersedes it in the
// same environment - that's normal lifecycle, not a failure - so we scan each deployment's
// full status history for a SUCCESS entry instead of trusting latestStatus alone.
const lastSuccessfulDeploys = deploymentEnvironments.map((env, i) => {
  const deployments = repoStatsAndDeploysResponse.repository[`env${i}`].nodes
  for (const deployment of deployments) {
    const successStatus = deployment.statuses.nodes.find((status) => status.state === 'SUCCESS')
    if (successStatus) {
      return { env, deployedAt: new Date(successStatus.createdAt), sha: deployment.commit.oid }
    }
  }
  return { env, deployedAt: null, sha: null }
})

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

// Compute Br0ws3rMetrics custom event attributes
const upcomingVersionMatch = releasePR?.title.match(/(\d+\.\d+\.\d+)/)
const upcomingVersion = upcomingVersionMatch ? upcomingVersionMatch[1] : ''

// Fetch PRs actually created in the last 30 days (any state) for a real "PRs created per
// person" rate. prsCreatedBy below is a snapshot of currently-open PRs, which double-counts
// a long-lived PR on every daily sample instead of counting it once - averaging that snapshot
// doesn't converge to "PRs created per week/month". This is a real, non-overlapping count
// instead: each dispatch run reports "created in the trailing N days", so query these with
// average(), not sum() - summing would multiply the count by however many samples fall in range.
const createdLookbackDays = 30
const createdLookbackCutoff = new Date(Date.now() - createdLookbackDays * 24 * 60 * 60 * 1000)
const recentlyCreatedPRs = []
let createdCursor = null

do {
  const response = await octokit.graphql(`
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 50, states: [OPEN, MERGED, CLOSED], after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            createdAt
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `, { owner, repo, cursor: createdCursor })

  const connection = response.repository.pullRequests
  recentlyCreatedPRs.push(...connection.nodes)
  const oldestInPage = connection.nodes[connection.nodes.length - 1]
  // PRs are ordered newest-created first, so once the oldest PR on this page is
  // already past the lookback cutoff, every later page is too - stop paging.
  createdCursor = connection.pageInfo.hasNextPage && oldestInPage && new Date(oldestInPage.createdAt) >= createdLookbackCutoff
    ? connection.pageInfo.endCursor
    : null
} while (createdCursor)

const createdCutoff7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
const prsCreatedLast7Days = recentlyCreatedPRs.filter((pr) => new Date(pr.createdAt) >= createdCutoff7Days)
const prsCreatedLast30Days = recentlyCreatedPRs.filter((pr) => new Date(pr.createdAt) >= createdLookbackCutoff)

// Mean time to cycle: the gap between a reviewer comment and the next commit,
// or between a commit and the next reviewer comment - i.e. every alternation
// between "reviewer spoke" and "author pushed" across each open PR's timeline.
const cycleIntervalsHours = []

for (const pr of prs) {
  const commitEvents = pr.commits.nodes.map((node) => ({
    type: 'commit',
    date: new Date(node.commit.committedDate)
  }))
  const commentEvents = reviewerCommentEvents(pr).map((date) => ({ type: 'comment', date }))

  const events = [...commitEvents, ...commentEvents].sort((a, b) => a.date - b.date)

  for (let i = 1; i < events.length; i++) {
    if (events[i - 1].type !== events[i].type) {
      cycleIntervalsHours.push((events[i].date - events[i - 1].date) / (1000 * 60 * 60))
    }
  }
}

const meanTimeToCycleHours = cycleIntervalsHours.length > 0
  ? cycleIntervalsHours.reduce((sum, hours) => sum + hours, 0) / cycleIntervalsHours.length
  : 0

const metrics = {
  meanTimeToMergeHours: mttmHours === null ? 0 : Math.round(mttmHours * 100) / 100,
  meanTimeToCycleHours: Math.round(meanTimeToCycleHours * 100) / 100,
  openPrCount: prs.length,
  openIssueCount: issues.length,
  currentVersion,
  upcomingVersion,
  failedWorkflowCount: activeFailedRuns.length,
  externalPrCount: externalPrs.length,
  neverReviewedCount: neverReviewed.length,
  needsRevisionsCount: needsRevisions.length,
  needsReReviewCount: needsReReview.length,
}

for (const login of Object.keys(githubToSlack)) {
  metrics[`prsReviewedBy.${login}`] = prs.filter((pr) =>
    pr.timelineItems.nodes.some((item) => {
      if (item.author?.login === login) return true
      if (item.__typename === 'PullRequestReviewThread' && item.comments?.nodes) {
        return item.comments.nodes.some((comment) => comment.author?.login === login)
      }
      return false
    })
  ).length

  metrics[`prsCreatedBy.${login}`] = prs.filter((pr) => pr.author?.login === login).length
  metrics[`prsCreatedLast7Days.${login}`] = prsCreatedLast7Days.filter((pr) => pr.author?.login === login).length
  metrics[`prsCreatedLast30Days.${login}`] = prsCreatedLast30Days.filter((pr) => pr.author?.login === login).length
}

// Build the daily dispatch Slack Block Kit payload
const blocks = []
const textLines = ['Browser Agent Daily Dispatch']

blocks.push(headerBlock('🌅 Browser Agent Daily Dispatch'))
blocks.push(dividerBlock())

// Repository Stats
const npmDownloadsText = repoStats.npmWeeklyDownloads === null ? 'unavailable' : `${repoStats.npmWeeklyDownloads.toLocaleString('en-US')} weekly NPM downloads`
blocks.push(sectionBlock(`*📊 Repository Stats*\n⭐ ${repoStats.stars} stars · 🍴 ${repoStats.forks} forks · 👀 ${repoStats.watchers} watchers · 📥 ${npmDownloadsText}`))
textLines.push(`Repository Stats: ${repoStats.stars} stars, ${repoStats.forks} forks, ${repoStats.watchers} watchers, ${npmDownloadsText}`)
blocks.push(dividerBlock())

// Build size status - the size-compare job in pull-request-checks.yml comments this
// tag on every PR (including release-please's), so it's expected to exist once checks
// finish running on the release PR.
const ASSET_SIZE_COMMENT_TAG = '<!-- browser_agent asset size report -->'
const sizeColorEmoji = { green: '🟢', yellow: '🟡', red: '🔴' }
const sizeColorSeverity = { green: 0, yellow: 1, red: 2 }

let buildSizeLines = null
let buildSizePending = false

if (releasePR) {
  const { data: releaseComments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: releasePR.number,
    per_page: 100,
  })
  const sizeComment = releaseComments.find((comment) => comment.body?.includes(ASSET_SIZE_COMMENT_TAG))

  if (sizeComment) {
    // Each data row: | agent | asset | ![size](...color=X) | ![deltaMain](...color=Y) | ![deltaRelease](...color=Z) |
    // Matched per-line (not across the whole body) so the header/separator rows can't
    // bleed into a following data row via a `\s*` that would otherwise cross the newline.
    const rowPattern = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*!\[([^\]]*)]\([^)]*color=(\w+)\)\s*\|\s*!\[([^\]]*)]\([^)]*color=(\w+)\)\s*\|\s*!\[([^\]]*)]\([^)]*color=(\w+)\)\s*\|\s*$/
    buildSizeLines = sizeComment.body.split('\n')
      .map((line) => line.match(rowPattern))
      .filter(Boolean)
      .map((match) => {
        // deltaMain is dropped - the release PR is synced with main, so it's ~always 0%.
        const [, agent, asset, size, sizeColor, , , deltaRelease, deltaReleaseColor] = match
        const worstColor = [sizeColor, deltaReleaseColor].sort((a, b) => (sizeColorSeverity[b] ?? 0) - (sizeColorSeverity[a] ?? 0))[0]
        const emoji = sizeColorEmoji[worstColor] ?? '⚪'
        const cleanDelta = deltaRelease.trim().replace(/\s+/g, '')
        return `${emoji} ${agent}/${asset}: ${size.trim()} (${cleanDelta})`
      })
  } else {
    buildSizePending = true
  }
}

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

  if (buildSizeLines && buildSizeLines.length > 0) {
    versionText += '\n\n*📏 Build Size vs Latest Release*\n' + buildSizeLines.join('\n')
  } else if (buildSizePending) {
    versionText += `\n\n📏 Build size report not yet available — see checks on <${releasePR.url}/checks|#${releasePR.number}>.`
  }
} else {
  versionText += '\nNo release is currently staged.'
}

blocks.push(sectionBlock(versionText))
blocks.push(dividerBlock())

// Release PR - kept separate from the review-state buckets below since it's release
// automation (release-please), not a contributor PR that needs the same triage.
renderPrSection(blocks, textLines, {
  emoji: '🔖',
  title: 'Release PR',
  prList: releasePR ? [releasePR] : [],
  emptyText: 'No release is currently staged.',
  mttmHours,
  statusSuffix: (pr) => ` • Review: ${pr.reviewDecision ?? 'PENDING'}`,
  showCount: false,
})

// External Contributor PRs
renderPrSection(blocks, textLines, {
  emoji: '🌍',
  title: 'External Contributor PRs',
  prList: externalPrs,
  emptyText: '✅ No open PRs from external contributors.',
  mttmHours,
  statusSuffix: (pr) => ` • ${pr.authorAssociation}`,
})

// Never Reviewed
renderPrSection(blocks, textLines, {
  emoji: '🆕',
  title: 'Never Reviewed',
  prList: neverReviewed,
  emptyText: '✅ No open PRs are awaiting a first review.',
  mttmHours,
  statusSuffix: () => ' • no review activity yet',
})

// Needs Revisions (feedback given, author hasn't pushed since)
renderPrSection(blocks, textLines, {
  emoji: '🟠',
  title: 'Needs Revisions',
  prList: needsRevisions,
  emptyText: '✅ No open PRs are waiting on author revisions.',
  mttmHours,
  statusSuffix: (pr) => ` • 🟠 This PR has been reviewed without new commits, ${pr.author?.login ? mentionFor(pr.author.login) : 'author'} please take a look.`,
})

// Needs Re-Review (author pushed after feedback, reviewer hasn't looked again)
renderPrSection(blocks, textLines, {
  emoji: '🔁',
  title: 'Needs Re-Review',
  prList: needsReReview,
  emptyText: '✅ No open PRs are waiting on a re-review.',
  mttmHours,
  statusSuffix: (pr, assigneeMentions) => (assigneeMentions.length > 0 ? ` • 🟠 ${assigneeMentions.join(' ')} please take a look.` : ''),
})

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
blocks.push(dividerBlock())

// Deployment Status
const deployLines = lastSuccessfulDeploys.map(({ env, deployedAt, sha }) => {
  if (!deployedAt) return `*${env}*: no successful deployment found in recent history`
  const formattedDate = deployedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `*${env}*: ${formattedDate} (\`${sha.slice(0, 7)}\`)`
})
blocks.push(sectionBlock(`*🚀 Deployment Status*\nLast successful deployment per environment:\n${deployLines.join('\n')}`))
textLines.push(`Deployment Status: ${lastSuccessfulDeploys.filter((d) => d.deployedAt).length}/${lastSuccessfulDeploys.length} environments have a known successful deploy`)

const payload = JSON.stringify({ text: textLines.join(' | '), blocks })
const metricsJson = JSON.stringify(metrics)

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  appendFileSync(githubOutput, `payload<<EOF\n${payload}\nEOF\n`)
  appendFileSync(githubOutput, `metrics<<EOF\n${metricsJson}\nEOF\n`)
} else {
  console.log(payload)
  console.log(metricsJson)
}
