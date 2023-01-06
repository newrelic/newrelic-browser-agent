/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import { computeStackTrace } from '../../../src/features/jserrors/aggregate/compute-stack-trace'
import { stringify } from '../../../src/common/util/stringify'
import testcases from './stack-parse-testcases'

test('computeStackTrace', function (t) {
  for (var i = 0; i < testcases.length; i++) {
    var testcase = testcases[i]
    t.equal(stringify(computeStackTrace(testcase.stack)), stringify(testcase.info), testcase.message)
  }
  t.end()
})
