/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../../tools/jil/browser-test')
var ee = require('ee')
var handleEE = ee.get('handle')

var hasXhr = window.XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener

require('../../../feature/xhr/instrument')

test('XHR request for Data URL does not generate telemetry', function(t) {
  if (!hasXhr) {
    t.skip('XHR is not supported in this browser')
    t.end()
    return
  }

  ee.addEventListener('send-xhr-start', validate)
  handleEE.addEventListener('xhr', failCase)

  try {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()
  } catch (e) {
    ee.removeEventListener('send-xhr-start', validate)
    handleEE.removeEventListener('xhr', failCase)

    t.skip('XHR with data URL not supported in this browser')
    t.end()
    return
  }

  t.plan(2)

  function validate (args, xhr) {
    t.equals(this.params.protocol, 'data', 'XHR Data URL request recorded')
    setTimeout(() => {
      ee.removeEventListener('send-xhr-start', validate)
      handleEE.removeEventListener('xhr', failCase)

      t.pass('XHR Data URL request did not generate telemetry')
      t.end()
    }, 100)
  }

  function failCase (params, metrics, start) {
    ee.removeEventListener('send-xhr-start', validate)
    handleEE.removeEventListener('xhr', failCase)

    t.fail('XHR Data URL request should not generate telemetry')
  }
})

test('Data URL Fetch requests do not generate telemetry', function(t) {
  if (!window.fetch) {
    t.pass('fetch is not supported in this browser')
    t.end()
    return
  }

  handleEE.addEventListener('xhr', failCase)

  ee.addEventListener('fetch-done', validate)

  fetch('data:,dataUrl')

  function validate () {
    t.equals(this.params.protocol, 'data', 'Fetch data URL request recorded')

    setTimeout(() => {
      handleEE.removeEventListener('xhr', failCase)
      ee.removeEventListener('fetch-done', validate)

      t.pass('Fetch data URL request did not generate telemetry')
      t.end()
    }, 100)
  }

  function failCase(params, metrics, start) {
    t.fail('Data URL Fetch requests should not generate telemetry')
    handleEE.removeEventListener('xhr', failCase)
    ee.removeEventListener('fetch-done', validate)
  }
})
