/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Regenerates the JSDoc block above `warn()` in src/common/util/console.js
 * from docs/warning-codes.md, so the hover tooltip always reflects the
 * documented warning codes.
 *
 * Run manually with `npm run generate:warning-codes`. Also run automatically
 * by the pre-commit hook whenever docs/warning-codes.md is staged.
 */

const fs = require('fs')
const path = require('path')

const DOCS_PATH = path.join(__dirname, '..', 'docs', 'warning-codes.md')
const CONSOLE_JS_PATH = path.join(__dirname, '..', 'src', 'common', 'util', 'console.js')
const START_MARKER = '/* GENERATED-WARNING-CODES:START -- run `npm run generate:warning-codes` after editing docs/warning-codes.md, do not hand-edit this block */'
const END_MARKER = '/* GENERATED-WARNING-CODES:END */'

function parseWarningCodes (markdown) {
  const codes = []
  const lines = markdown.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^### (\d+)/)
    if (!headingMatch) continue
    const code = Number(headingMatch[1])
    const messageLine = lines[i + 1] || ''
    const messageMatch = messageLine.match(/^`(.*)`$/)
    if (!messageMatch) throw new Error(`Expected a backtick-quoted message on the line after "### ${code}" in ${DOCS_PATH}`)
    codes.push({ code, message: messageMatch[1] })
  }
  if (!codes.length) throw new Error(`No warning codes found in ${DOCS_PATH}`)
  return codes
}

function escapeForJsDoc (message) {
  return message
    .replace(/\*/g, '\\*')
    .replace(/\|/g, '\\|')
}

function buildJsDocBlock (codes) {
  const tableRows = codes
    .map(({ code, message }) => ` * | ${code} | ${escapeForJsDoc(message)} |`)
    .join('\n')
  const union = codes.map(({ code }) => code).join('|')

  return `${START_MARKER}
/**
 * A helper method to warn to the console with New Relic: decoration.
 *
 * \`code\` corresponds to an entry in
 * {@link https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md warning-codes.md}:
 *
 * | Code | Message |
 * |------|---------|
${tableRows}
 *
 * @param {${union}} code The warning code to emit, which will be used to link to the warning code documentation
 * @param {*} [secondary] Secondary data to include, usually an extra message, error or object
 * @returns
 */
${END_MARKER}`
}

function main () {
  const markdown = fs.readFileSync(DOCS_PATH, 'utf8')
  const codes = parseWarningCodes(markdown)
  const newBlock = buildJsDocBlock(codes)

  const consoleJs = fs.readFileSync(CONSOLE_JS_PATH, 'utf8')
  const startIndex = consoleJs.indexOf(START_MARKER)
  const endIndex = consoleJs.indexOf(END_MARKER)
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Could not find GENERATED-WARNING-CODES markers in ${CONSOLE_JS_PATH}`)
  }

  const updated = consoleJs.slice(0, startIndex) + newBlock + consoleJs.slice(endIndex + END_MARKER.length)

  if (updated === consoleJs) {
    console.log('console.js warning code JSDoc is already up to date.')
    return
  }

  fs.writeFileSync(CONSOLE_JS_PATH, updated)
  console.log('Updated warning code JSDoc in src/common/util/console.js')
}

main()
