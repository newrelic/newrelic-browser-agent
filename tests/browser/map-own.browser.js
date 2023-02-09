/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { mapOwn } from '../../src/common/util/map-own'

test('map-own', function (t) {
  var obj = { a: 10 }
  mapOwn(obj, function (k, v) {
    t.equal(k, 'a', 'key is as expected')
    t.equal(v, 10, 'value is as expected')
  })

  function F () {}
  F.prototype = { bad: 1111 }
  var extended = new F()
  extended.good = 2222
  mapOwn(extended, function (k, v) {
    t.equal(k, 'good', 'extended key is as expected')
    t.equal(v, 2222, 'extended value is as expected')
  })

  Object.prototype.aargh = 1234

  var obj3 = {
    a: 1,
    b: 2,
    c: 3,
    d: 4
  }

  var str = ''
  var num = 0

  var ones = mapOwn(obj3, function (k, v) {
    str += k
    num += v
    return 1
  })

  t.equal(str, 'abcd', 'many props work')
  t.equal(num, 10, 'many values work')
  t.equal(ones.join(''), '1111', 'returned array makes sense')

  delete Object.prototype.aargh

  t.end()
})
