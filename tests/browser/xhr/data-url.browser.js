/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import test from '../../../tools/jil/browser-test'
import { setup } from '../utils/setup'
import { Instrument as AjaxInstrum } from '@newrelic/browser-agent-core/src/features/ajax/instrument/index'

const { baseEE, agentIdentifier, aggregator } = setup();
const ajaxTestInstr = new AjaxInstrum(agentIdentifier, aggregator, false); // attach instrumentation event handlers to agent's events (baseEE)
const handleEE = baseEE.get('handle');
const hasXhr = window.XMLHttpRequest && XMLHttpRequest.prototype && XMLHttpRequest.prototype.addEventListener;

test('XHR request for Data URL does not generate telemetry', function(t) {
  if (!hasXhr) {
    t.skip('XHR is not supported in this browser')
    t.end()
    return
  }

  baseEE.addEventListener('send-xhr-start', validate)
  handleEE.addEventListener('xhr', failCase)

  try {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', 'data:,dataUrl')
    xhr.send()
  } catch (e) {
    baseEE.removeEventListener('send-xhr-start', validate)
    handleEE.removeEventListener('xhr', failCase)

    t.skip('XHR with data URL not supported in this browser')
    t.end()
    return
  }

  t.plan(2)

  function validate (args, xhr) {
    t.equals(this.params.protocol, 'data', 'XHR Data URL request recorded')
    setTimeout(() => {
      baseEE.removeEventListener('send-xhr-start', validate)
      handleEE.removeEventListener('xhr', failCase)

      t.pass('XHR Data URL request did not generate telemetry')
      t.end()
    }, 100)
  }

  function failCase (params, metrics, start) {
    baseEE.removeEventListener('send-xhr-start', validate)
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

  baseEE.addEventListener('fetch-done', validate)

  fetch('data:,dataUrl')

  function validate () {
    t.equals(this.params.protocol, 'data', 'Fetch data URL request recorded')

    setTimeout(() => {
      handleEE.removeEventListener('xhr', failCase)
      baseEE.removeEventListener('fetch-done', validate)

      t.pass('Fetch data URL request did not generate telemetry')
      t.end()
    }, 100)
  }

  function failCase(params, metrics, start) {
    t.fail('Data URL Fetch requests should not generate telemetry')
    handleEE.removeEventListener('xhr', failCase)
    baseEE.removeEventListener('fetch-done', validate)
  }
})
