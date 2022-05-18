/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../../tools/jil/browser-test'
import { computeStackTrace } from '../../../../packages/browser-agent-core/features/js-errors/aggregate/compute-stack-trace'
import { stringify } from '../../../../packages/browser-agent-core/common/util/stringify'
import testcases from './stack-parse-testcases'

test('computeStackTrace', function (t) {
  for (var i = 0; i < testcases.length; i++) {
    var testcase = testcases[i]
    t.equal(stringify(computeStackTrace(testcase.stack)), stringify(testcase.info), testcase.message)
  }
  t.end()
})
