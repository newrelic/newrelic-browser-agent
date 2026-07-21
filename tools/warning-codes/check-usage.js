/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pre-commit guard: scans staged additions for calls like `warn(42, ...)` and
 * fails the commit if the numeric code has no matching `### 42` entry in
 * docs/warning-codes.md. Prevents shipping a warning code that was never
 * documented.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const DOCS_PATH = path.join(__dirname, '..', '..', 'docs', 'warning-codes.md')
const WARN_CALL_PATTERN = /\bwarn\(\s*(\d+)\s*[,)]/g
const FILE_HEADER_PATTERN = /^\+\+\+ b\/(.+)$/
const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

function getDefinedWarningCodes () {
  let markdown
  try {
    markdown = execSync('git show :docs/warning-codes.md', { encoding: 'utf8' })
  } catch {
    markdown = fs.readFileSync(DOCS_PATH, 'utf8')
  }

  const codes = new Set()
  for (const match of markdown.matchAll(/^### (\d+)/gm)) {
    codes.add(Number(match[1]))
  }
  return codes
}

function getAddedWarnCalls () {
  const diff = execSync(
    'git diff --cached --unified=0 --no-color --diff-filter=ACM -- "src/**/*.js"',
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 }
  )

  const calls = []
  let currentFile = null
  let currentLine = null

  for (const rawLine of diff.split('\n')) {
    const fileHeaderMatch = rawLine.match(FILE_HEADER_PATTERN)
    if (fileHeaderMatch) {
      currentFile = fileHeaderMatch[1]
      continue
    }

    const hunkHeaderMatch = rawLine.match(HUNK_HEADER_PATTERN)
    if (hunkHeaderMatch) {
      currentLine = Number(hunkHeaderMatch[1])
      continue
    }

    if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) continue
    if (currentFile == null || currentLine == null) continue

    for (const match of rawLine.matchAll(WARN_CALL_PATTERN)) {
      calls.push({ file: currentFile, line: currentLine, code: Number(match[1]) })
    }
    currentLine++
  }

  return calls
}

function main () {
  const definedCodes = getDefinedWarningCodes()
  const addedCalls = getAddedWarnCalls()
  const undocumented = addedCalls.filter(({ code }) => !definedCodes.has(code))

  if (!undocumented.length) return

  console.error('\nCommit blocked: warn() called with an undocumented warning code.')
  console.error('Add a matching "### <code>" entry (with a backtick-quoted message) to docs/warning-codes.md, then commit again.\n')
  for (const { file, line, code } of undocumented) {
    console.error(`  ${file}:${line} - warn(${code}, ...) has no docs/warning-codes.md#${code} entry`)
  }
  console.error('')
  process.exit(1)
}

main()
