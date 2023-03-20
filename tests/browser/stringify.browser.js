/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../tools/jil/browser-test'
import { stringify } from '../../src/common/util/stringify.js'

test('fake stringify', function (t) {
  var arr = [0, 1, 'asdf', undefined, null, 'weee']

  var obj = { a: 123, c: 'b', f: 'asdf', u: undefined, n: null }

  function F () {}
  F.prototype = obj

  var obj2 = new F()
  obj2.other = 222

  var obj3 = { stringified: stringify(obj) }

  t.equal(stringify(arr), '[0,1,"asdf",null,null,"weee"]', 'Array')
  t.equal(stringify(undefined), undefined, 'undefined')
  t.equal(stringify(null), 'null', 'null')
  t.equal(stringify(123), '123', 'number')
  t.equal(stringify(obj), '{"a":123,"c":"b","f":"asdf","n":null}', 'obj')
  t.equal(stringify(obj2), '{"other":222}', 'obj w/ prototype')
  t.equal(stringify(F), undefined, 'function')
  t.ok(stringify(obj3) === '{"stringified":"{\\"a\\":123,\\"c\\":\\"b\\",\\"f\\":\\"asdf\\",\\"n\\":null}"}', 'stringified object')

  var a = {}
  a.a = a
  t.equal(stringify(a), '{}', 'Stringifying a circular object returns empty object')

  t.end()
})
