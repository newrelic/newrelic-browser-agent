/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import { responseSizeFromXhr } from '../../../packages/browser-agent-core/features/ajax/instrument/response-size'

test('ms-stream has undefined size', function(t) {
  var xhrRequest = {
    responseType: 'ms-stream',
    response: '12345',
    responseText: 'text'
  }

  var ret = responseSizeFromXhr(xhrRequest, 0)
  t.ok(ret === undefined, 'returned size should be undefined')
  t.end()
})

test('arraybuffer returns response size', function(t) {
  if (typeof ArrayBuffer !== 'function') {
    t.comment('ArrayBuffer constructor is not supported in this browser, skipping')
    t.end()
    return
  }

  var obj = new ArrayBuffer(8)
  var xhrRequest = {
    responseType: 'arraybuffer',
    response: obj,
    responseText: 'text'
  }

  var ret = responseSizeFromXhr(xhrRequest, 0)
  t.ok(ret === obj.byteLength, 'returned size should be arraybuffer size')
  t.end()
})

test('blob returns response size', function(t) {
  if (typeof Blob !== 'function') {
    t.comment('Blob constructor is not supported in this browser, skipping')
    t.end()
    return
  }

  var text = ['<a id="a"><b id="b">hey!</b></a>']
  var blob = new Blob(text, {type: 'text/html'})

  var xhrRequest = {
    responseType: 'blob',
    response: blob,
    responseText: 'text'
  }

  var ret = responseSizeFromXhr(xhrRequest, 0)
  t.ok(ret === blob.size, 'returned size should be blob size')
  t.end()
})

test('json returns response size', function(t) {
  var obj = JSON.parse('{"hello": "world"}')

  var xhrRequest = {
    responseType: 'json',
    response: obj,
    responseText: 'text'
  }

  var ret = responseSizeFromXhr(xhrRequest, null)
  t.ok(ret === JSON.stringify(obj).length, 'returned size should be json size')
  t.end()
})

test('text returns responseText size', function(t) {
  var text = 'responseText'

  var xhrRequest = {
    responseType: 'text',
    response: 'response',
    responseText: text
  }

  var ret = responseSizeFromXhr(xhrRequest, null)
  t.ok(ret === text.length, 'returned size should be text size')
  t.end()
})

test('default empty string type returns responseText size', function(t) {
  var text = 'responseText'

  var xhrRequest = {
    responseType: '',
    response: 'response',
    responseText: text
  }

  var ret = responseSizeFromXhr(xhrRequest, null)
  t.ok(ret === text.length, 'returned size should be text size')
  t.end()
})
