import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { args } from './args.js'
import { fetchRetry } from '../shared-utils/fetch-retry.js'

const MAX_DIFF_LENGTH = 60000
const EXCLUDED_FILE_PATTERNS = [/package-lock\.json$/, /\.min\.js$/, /^build\//]

const REVIEW_SYSTEM_PROMPT = `You are an experienced JavaScript/browser-agent reviewer. Review the following pull request diff for the New Relic Browser Agent. Call out correctness bugs, security issues, and missed edge cases. Be concise and reference file paths and line numbers where possible. If nothing of substance stands out, say so briefly.`

const octokit = new Octokit({ auth: args.githubToken })
const { owner, repo } = github.context.repo

function filterDiff (diff) {
  const lines = diff.split('\n')
  const kept = []

  
  let skippingFile = false

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const filePath = line.split(' b/')[1] ?? ''
      skippingFile = EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(filePath))
    }
    if (!skippingFile) kept.push(line)
  }

  let filtered = kept.join('\n')
  let truncated = false
  if (filtered.length > MAX_DIFF_LENGTH) {
    filtered = filtered.slice(0, MAX_DIFF_LENGTH)
    truncated = true
  }

  return { filtered, truncated }
}

async function main () {
  const { data: prDiff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: args.prNumber,
    mediaType: { format: 'diff' }
  })

  const { filtered, truncated } = filterDiff(prDiff)

  if (!filtered.trim()) {
    console.log('No reviewable changes found in diff after filtering.')
    core.setOutput('review', '')
    return
  }

  const requestUrl = `${args.ncBaseUrl}/v1/chat/completions`
  const requestBody = JSON.stringify({
    model: args.ncModel,
    messages: [
      { role: 'system', content: REVIEW_SYSTEM_PROMPT },
      { role: 'user', content: filtered }
    ]
  })

  // DEBUG: prints a copy-pasteable curl command for manually reproducing this request.
  // The token is masked by GitHub Actions log redaction since it comes from a secret,
  // but the placeholder here also guards against redaction failing.
  console.log('DEBUG curl for Nerd Completion request:')
  console.log(`curl -s -o - -w '\\nHTTP_STATUS:%{http_code}\\n' -X POST '${requestUrl}' \\
  -H 'Authorization: Bearer ***REDACTED***' \\
  -H 'Content-Type: application/json' \\
  -d '${requestBody.replace(/'/g, "'\\''")}'`)

  const response = await fetchRetry(requestUrl, {
    retry: 3,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.ncApiToken}`,
      'Content-Type': 'application/json'
    },
    body: requestBody
  })

  console.log(`DEBUG Nerd Completion response status: ${response?.status} ${response?.statusText}`)

  if (!response?.ok) {
    const errorBody = await response?.text().catch(() => '<unreadable body>')
    console.error(`Nerd Completion request failed with status ${response?.status}. ${response?.statusText}`)
    console.log(`DEBUG Nerd Completion error response body:\n${errorBody}`)
    core.setOutput('review', '')
    return
  }

  const rawBody = await response.text()
  console.log(`DEBUG Nerd Completion response body:\n${rawBody}`)

  const body = JSON.parse(rawBody)
  const review = body?.choices?.[0]?.message?.content

  if (!review) {
    console.error('Nerd Completion response did not contain review content.')
    core.setOutput('review', '')
    return
  }

  const suffix = truncated ? '\n\n_Note: this diff was truncated before review due to size._' : ''
  core.setOutput('review', `${review}${suffix}`)
}

main().catch(err => {
  const detail = err.code ?? err.cause?.code ?? err.cause?.message ?? 'unknown'
  console.error(`LLM code review failed: ${err.message} (detail: ${detail})`)
  if (err.stack) console.error(err.stack)
  core.setOutput('review', '')
})
