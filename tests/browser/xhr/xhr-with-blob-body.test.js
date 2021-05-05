/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let BrowserMatcher = require('../../../tools/jil/util/browser-matcher')
let xhrSupported = BrowserMatcher.withFeature('xhr')
let blobSupported = BrowserMatcher.withFeature('blob')
let supported = xhrSupported.intersect(blobSupported)

jil.browserTest('xhr with blob request body', supported, function (t) {
  require('../../../feature/xhr/instrument/index')
  let drain = require('../../../agent/drain')
  let register = require('../../../agent/register-handler')

  t.plan(3)

  let xhr = new XMLHttpRequest()
  xhr.open('POST', '/postwithhi/blobxhr')

  xhr.responseType = 'blob'
  xhr.setRequestHeader('Content-Type', 'text/plain')
  xhr.onload = function (e) {
    var xhr = e.target
    var reader = new FileReader()
    reader.addEventListener('loadend', function () {
      t.equal(reader.result, 'hi!', 'blob content matches')
    }, false)
    reader.readAsText(xhr.response)
  }

  xhr.send(new Blob(['hi!']))

  register('xhr', function (params, metrics, start) {
    require('../../../feature/xhr/aggregate')(params, metrics, start)

    t.equal(metrics.txSize, 3, 'correct size for sent blob objects')
    t.equal(metrics.rxSize, 3, 'correct size for received blob objects')
  })

  drain('feature')
})
