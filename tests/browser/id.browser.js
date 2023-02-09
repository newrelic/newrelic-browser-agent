/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { id } from '../../src/common/ids/id'
var win = window

test('id', function (t) {
  var a = {}
  var aId = id(a)

  function F () {}
  F.prototype = a

  var b = new F()

  t.equal(typeof aId, 'number', 'Id is a number')
  t.equal(id(undefined), -1, 'id of undefined is -1')
  t.equal(id(2), -1, 'id of number is -1')
  t.equal(id('foo'), -1, 'id of string is -1')
  t.equal(id(null), -1, 'id of string is -1')
  t.equal(id({}) - id({}), -1, 'An id, minus the next id is -1')
  t.ok(id({}) >= 3, 'id is at least 3')
  t.equal(id(a), aId, 'Id is the same when called twice on an obj')
  t.equal(id(win), 0, 'Global id = 0')
  t.ok(id(function () {}) >= 4, 'id of a function makes sense')
  t.equal(b['nr@id'], aId, 'b has inherited id')
  t.notEqual(id(b), aId, 'instance id is not the same as inherited id')
  t.end()
})
