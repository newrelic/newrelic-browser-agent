/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { cleanURL } from '../../src/common/url/clean-url'

var testcases = [
  ['http://domain.com/path?query=5', 'http://domain.com/path', 'http://domain.com/path'],
  ['http://domain.com/path#fragment', 'http://domain.com/path', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5#fragment', 'http://domain.com/path', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5?dumb#fragment', 'http://domain.com/path', 'http://domain.com/path#fragment'],
  ['http://domain.com/path?query=5#fragment#dumb', 'http://domain.com/path', 'http://domain.com/path#fragment#dumb'],
  ['http://domain.com/path?query=5#fragment#dumb?additional_query', 'http://domain.com/path', 'http://domain.com/path#fragment#dumb'],
  ['http://domain.com/path?query=5#fragment/silly/dumber#dumbest?additional_query=silly#what_is_this_even', 'http://domain.com/path', 'http://domain.com/path#fragment/silly/dumber#dumbest']
]

test('cleanURL', function (t) {
  for (var i = 0; i < testcases.length; i++) {
    var testcase = testcases[i]
    t.equal(cleanURL(testcase[0]), testcase[1], 'Removes the query string: ' + testcase[1])
    t.equal(cleanURL(testcase[0], true), testcase[2], 'Includes the hash when indicated: ' + testcase[0])
  }

  t.end()
})
