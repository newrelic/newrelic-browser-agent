/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pre-commit and CI guard: scans `src/` for supportability metrics and fails if they are out of sync with
 * tools/supportability-metrics/registry.js, or if docs/supportability-metrics.md is not what the registry generates.
 *
 * `--fix` appends a stub registry entry for every emitted metric the registry does not cover, then regenerates the docs.
 * The stub still fails the check until its placeholder description is replaced. The new metric is also added to the list of metrics
 * without a generated test (tests/components/supportability-metrics/pending.js), which only warns, so write its trigger when you can.
 */

const fs = require('fs')
const { checkRepo, compare, scanRepo, renderStubs, appendToRegistry, appendToPending, renderDocs, DOCS_PATH } = require('./lib')

if (process.argv.includes('--fix')) {
  const { unregistered } = compare(scanRepo(), require('./registry'))
  if (unregistered.length) {
    appendToRegistry(renderStubs(unregistered, require('./registry')))
    appendToPending([...new Set(unregistered.map(({ pattern }) => pattern.split('<*>').join('<name>')))])
    delete require.cache[require.resolve('./registry')]
    console.log(`Added ${new Set(unregistered.map(e => e.pattern)).size} stub entr(ies) to tools/supportability-metrics/registry.js. Write their descriptions, check their section, and add a trigger in tests/components/supportability-metrics/triggers (they are listed in pending.js until then).`)
  }
  fs.writeFileSync(DOCS_PATH, renderDocs(require('./registry')))
}

const errors = checkRepo()
if (errors.length) {
  console.error('\nSupportability metric check failed:\n')
  errors.forEach(error => console.error(`  - ${error}`))
  if (errors.some(error => error.startsWith('Emitted but not in the registry'))) console.error('\nRun `npm run supportability-metrics:check -- --fix` to add stub registry entries for any new metrics and regenerate the docs.')
  console.error('')
  process.exit(1)
}
console.log('Supportability metrics are in sync.')
