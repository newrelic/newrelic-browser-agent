/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
import { setup } from '../utils/setup'

const { agentIdentifier, baseEE, aggregator } = setup()

jil.browserTest('xhr with blob request body', async function (t) {
  const { Instrument: AjaxInstrum } = await import('../../../src/features/ajax/instrument/index')
  const ajaxTestInstr = new AjaxInstrum(agentIdentifier, aggregator, false)
  const { drain } = await import('../../../src/common/drain/drain')
  const { registerHandler } = await import('../../../src/common/event-emitter/register-handler')

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

  registerHandler('xhr', async function (params, metrics, start) {
    const { Aggregate: AjaxAggreg } = await import('../../../src/features/ajax/aggregate/index')
    const ajaxTestAgg = new AjaxAggreg(agentIdentifier, aggregator)
    ajaxTestAgg.storeXhr(params, metrics, start)

    t.equal(metrics.txSize, 3, 'correct size for sent blob objects')
    t.equal(metrics.rxSize, 3, 'correct size for received blob objects')
  }, undefined, baseEE)

  drain(agentIdentifier, 'feature')
})
