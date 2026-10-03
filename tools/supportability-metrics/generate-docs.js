/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Regenerates docs/supportability-metrics.md from tools/supportability-metrics/registry.js.
 */

const fs = require('fs')
const { DOCS_PATH, renderDocs } = require('./lib')

fs.writeFileSync(DOCS_PATH, renderDocs(require('./registry')))
console.log('Generated docs/supportability-metrics.md')
