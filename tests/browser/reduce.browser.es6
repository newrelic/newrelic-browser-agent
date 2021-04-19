/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var reduce = require('../../reduce')
var test = require('../../tools/jil/browser-test.js')

test('reduce', function (t) {
  var nums = [ 1, 5, 10 ]
  t.equal(reduce(nums, add, 0), 16)
  t.equal(reduce(nums, add), 16, 'implicit starting value')

  var objs = [
    {name: 'a', value: 33},
    {name: 'b', value: 22},
    {name: 'c', value: 11}
  ]

  var obj = reduce(objs, build, {})

  t.equal(obj.b, 22, 'object reduce')

  var strs = [ 'a', 'b', 'c' ]

  t.equal(reduce(strs, add, ''), 'abc', 'correct order')

  t.end()
})

function add (a, b) {
  return a + b
}

function build (result, item) {
  result[item.name] = item.value
  return result
}
