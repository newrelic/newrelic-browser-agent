/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var encode = require('../../agent/encode')

test('encode.qs', function (t) {
  t.equal(encode.qs('Asdf:, :, /@$;'), 'Asdf:,%20:,%20/@$;', 'Escapes and unescapes')
  t.equal(encode.qs(), 'null', 'Empty returns "null"')
  t.equal(encode.qs(undefined), 'null', 'undefined returns "null"')
  t.equal(encode.qs(null), 'null', 'null returns "null"')
  t.end()
})

test('encode.fromArray', function (t) {
  var absurdTest = ['a', 'b', 'c']
  t.equal(encode.fromArray(absurdTest, 2), 'ab', 'Cut off cleanly at bytes')
  var doubleTest = ['aa', 'bb', 'cc']
  t.equal(encode.fromArray(doubleTest, 5), 'aabb', 'Fall back to largest whole chunk that wokrs')
  t.end()
})

test('encode.obj', function (t) {
  var obj1 = {foo: [1, 2, 3]}
  t.equal(encode.obj(obj1, 12), '&foo=%5B1,2%5D', 'Cut off cleanly')

  var obj2 = {bar: ['a', 'b', 'c']}
  t.equal(encode.obj(obj2, 30), '&bar=%5B%22a%22,%22b%22%5D', 'Fall back to largest whole chunk that wokrs')

  var circular = {}
  circular.circular = circular
  var obj3 = {bar: ['a', circular, 'c']}
  t.equal(encode.obj(obj3, 1000), '&bar=%5B%22a%22,null,%22c%22%5D', 'Handle bad objects')

  t.end()
})

test('encode.param', function (t) {
  t.equal(encode.param('foo', null), '', 'Empty string for things without a value')
  t.equal(encode.param('foo', 'bar'), '&foo=bar', 'formed key value for two strings')
  t.equal(encode.param('foo', {}), '', 'Empty string for non string values')
  t.end()
})
