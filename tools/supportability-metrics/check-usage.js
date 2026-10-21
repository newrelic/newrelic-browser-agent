/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pre-commit and CI guard: scans `src/` for supportability metrics and fails if they are out of sync with
 * tools/supportability-metrics/registry.js, or if docs/supportability-metrics.md is not what the registry generates.
 *
 * `--fix` appends a stub registry entry for every emitted metric the registry does not cover, then regenerates the docs. The stub still
 * fails the check until its placeholder description is replaced, so a person always has to finish the job. The new metric is also added to
 * the list of metrics without a generated test (tests/components/supportability-metrics/pending.js), which only warns, so write its
 * trigger when you can. The pre-commit hook runs this with `--fix`. CI never does: it is read-only and tells the author what to do.
 */

const fs = require('fs')
const { createStyle, shouldUseColor, highlight } = require('./colors')
const { checkRepo, compare, scanRepo, renderStubs, appendToRegistry, appendToPending, registryLocation, renderDocs, DOCS_PATH } = require('./lib')

const REGISTRY_FILE = 'tools/supportability-metrics/registry.js'
const PENDING_FILE = 'tests/components/supportability-metrics/pending.js'
const TESTING_GUIDE = 'tests/components/supportability-metrics/README.md'
const isCI = Boolean(process.env.CI)
const c = createStyle(shouldUseColor(process.env, process.stdout.isTTY || process.stderr.isTTY))

if (process.argv.includes('--fix')) {
  if (isCI) {
    console.error('`--fix` edits files, so it is not allowed in CI. Run it locally and commit the result.')
    process.exit(1)
  }
  const { unregistered } = compare(scanRepo(), require('./registry'))
  if (unregistered.length) {
    const stubbedTag = (pattern) => pattern.split('<*>').join('<name>')
    const stubbed = [...new Set(unregistered.map(({ pattern }) => stubbedTag(pattern)))]
    const reportedAt = new Map(unregistered.map(({ pattern, file, line }) => [stubbedTag(pattern), `${file}:${line}`]).reverse()) // first place each is reported
    appendToRegistry(renderStubs(unregistered, require('./registry')))
    appendToPending(stubbed)
    delete require.cache[require.resolve('./registry')]
    const plural = stubbed.length === 1
    const subject = plural ? 'a supportability metric' : `${stubbed.length} supportability metrics`
    const it = plural ? 'it' : 'them'
    const isAre = plural ? 'It is' : 'They are'
    const eachOf = plural ? 'it' : 'each'
    const found = c.label('Found ' + subject + ' reported in src/ with no entry in the registry')
    console.log(`\n${found} ${c.dim('(')}${c.path(REGISTRY_FILE)}${c.dim(')')}${c.label(':')}`)
    stubbed.forEach(tag => console.log(`  ${c.dim('-')} ${c.tag(tag)}  ${c.dim('(reported at')} ${c.path(reportedAt.get(tag))}${c.dim(')')}`))
    const why = c.dim('\nA stub entry was added for ' + eachOf + ', because every metric needs a registry entry to keep the docs and the Angler tag list complete.')
    console.log(`${why} ${c.label('Two things to do:')}`)
    const describe = c.label('Describe ' + it)
    console.log(`\n  ${c.label('1.')} ${describe} ${c.required('(required)')}${c.label('.')} Replace the TODO description, and check the section, in the registry:`)
    stubbed.forEach(tag => console.log(`       ${c.dim('-')} ${c.tag(tag)}  ${c.dim('->')}  ${c.path(registryLocation(tag))}`))
    console.log(`     ${c.dim('Then commit again.')} ${c.label('The commit stays blocked until this is done.')}`)
    const test = c.label('Test ' + it)
    console.log(`\n  ${c.label('2.')} ${test} ${c.optional('(can wait, but do not forget)')}${c.label('.')} ${isAre} now listed in ${c.path(PENDING_FILE)}, which only warns.`)
    console.log(c.dim('     Until you add a "trigger" (a few lines that make the agent report the metric), nothing proves the metric is really reported:'))
    console.log(c.dim('     if the code changes and it stops firing, no test fails, and it quietly disappears from Angler and the dashboards.'))
    console.log(`     ${c.label('How to:')} ${c.path(TESTING_GUIDE)} ${c.dim('(step by step, with instructions you can hand to Claude)')}`)
  }
  fs.writeFileSync(DOCS_PATH, renderDocs(require('./registry')))
}

const errors = checkRepo()
if (errors.length) {
  console.error(`\n${c.required('Supportability metric check failed:')}\n`)
  errors.forEach(error => console.error(`  ${c.red('-')} ${highlight(error, c)}`))
  if (isCI) {
    console.error(`\n${c.label('This check is read-only in CI.')} To fix it: run ${c.tag('npm run supportability-metrics:check -- --fix')} locally, fill in the description of each stub entry in ${c.path(REGISTRY_FILE)}, and commit ${c.path(REGISTRY_FILE)}, ${c.path(PENDING_FILE)} and ${c.path('docs/supportability-metrics.md')}. Then add a test for the new metric when you can: see ${c.path(TESTING_GUIDE)}.`)
  } else if (errors.some(error => error.startsWith('Emitted but not in the registry'))) {
    console.error(`\nRun ${c.tag('npm run supportability-metrics:check -- --fix')} to add stub registry entries for any new metrics and regenerate the docs.`)
  }
  console.error('')
  process.exit(1)
}
console.log(c.green('Supportability metrics are in sync.'))
