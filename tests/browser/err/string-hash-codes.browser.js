/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../../tools/jil/browser-test')
var stringHashCode = require('../../../feature/err/aggregate/string-hash-code')

test('stringHashCode', function (t) {
  var testcases = [
    [null, 0, 'Return 0 for null'],
    [undefined, 0, 'Return 0 for undefined'],
    ['', 0, 'Return 0 for empty string'],
    ['lksjdflksjdf', 32668720, 'Correct hash code']
  ]

  for (var i = 0; i < testcases.length; i++) {
    var testcase = testcases[i]
    t.equal(stringHashCode(testcase[0]), testcase[1], testcase[2])
  }
  t.end()
})
