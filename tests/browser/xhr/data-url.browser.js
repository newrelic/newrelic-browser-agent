/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test')
const ee = require('ee')
const handleEE = ee.get('handle')

const hasXhr = window.XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener

require('../../../feature/xhr/instrument')

test('XHR request for Data URL does not generate telemetry', function(t) {
  if (!hasXhr) {
    t.pass('xhr is not supported in this browser')
    t.end()
    return
  }

  handleEE.addEventListener('xhr', failCase)

  ee.addEventListener('send-xhr-start', validate)

  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'data:,data-uri')
  xhr.send()

  function validate (args, xhr) {
    t.equals(this.params.protocol, 'data', 'XHR Data URL request recorded')
    setTimeout(() => {
      handleEE.removeEventListener('xhr', failCase)
      ee.removeEventListener('send-xhr-start', validate)

      t.pass('XHR Data URL request did not generate telemetry')
      t.end()
    }, 100)
  }

  function failCase (params, metrics, start) {
    t.fail('XHR request for Data URL should not generate telemetry')
    handleEE.removeEventListener('xhr', failCase)
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
