/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test')
const qp = require('@newrelic/nr-querypack')

test('storeXhr for a SPA ajax request buffers in spaAjaxEvents', function (t) {
  const loader = require('loader')
  loader.features.xhr = true
  
  const storeXhr = require('../../../feature/xhr/aggregate/index')
  const ajaxEvents = require('../../../feature/xhr/aggregate/index').ajaxEvents
  const spaAjaxEvents = require('../../../feature/xhr/aggregate/index').spaAjaxEvents

  const context = {
    spaNode: {
      interaction: {
        id: 0
      }
    }
  }

  const ajaxArguments = [
    { // params
      method: 'PUT',
      status: 200,
      host: 'https://example.com',
      pathname: '/pathname'
    },
    { // metrics
      txSize: 128,
      rxSize: 256,
      cbTime: 5
    },
    0, // startTime
    10, // endTime
    'XMLHttpRequest' // type
  ]
  
  storeXhr.apply(context, ajaxArguments)

  console.log('spaAjaxEvents', spaAjaxEvents)
  console.log('ajaxEvents', ajaxEvents)

  t.end()
})

test('storeXhr for a non-SPA ajax request buffers in ajaxEvents', function (t) {
  const loader = require('loader')
  loader.features.xhr = true
  
  const storeXhr = require('../../../feature/xhr/aggregate/index')
  const ajaxEvents = require('../../../feature/xhr/aggregate/index').ajaxEvents
  const spaAjaxEvents = require('../../../feature/xhr/aggregate/index').spaAjaxEvents

  const context = {
    spaNode: undefined
  }

  const ajaxArguments = [
    { // params
      method: 'PUT',
      status: 200,
      host: 'https://example.com',
      pathname: '/pathname'
    },
    { // metrics
      txSize: 128,
      rxSize: 256,
      cbTime: 5
    },
    0, // startTime
    10, // endTime
    'XMLHttpRequest' // type
  ]
  
  storeXhr.apply(context, ajaxArguments)

  console.log('spaAjaxEvents', spaAjaxEvents)
  console.log('ajaxEvents', ajaxEvents)

  t.end()
})

test('prepareHarvest correctly serializes an AjaxRequest events payload', function (t) {
  const loader = require('loader')
  loader.features.xhr = true
  
  const storeXhr = require('../../../feature/xhr/aggregate/index')
  const prepareHarvest = require('../../../feature/xhr/aggregate/index').prepareHarvest
  const ajaxEvents = require('../../../feature/xhr/aggregate/index').ajaxEvents


  const ajaxEvent = {
    startTime: 0,
    endTime: 5,
    method: 'GET',
    status: 200,
    domain: 'https://example.com',
    path: '/',
    requestSize: 256,
    responseSize: 256,
    type: 'fetch'
  }

  ajaxEvents.push(ajaxEvent)

  loader.info = {
    jsAttributes: {
      customStringAttribute: 'customStringAttribute',
      customNumAttribute: 2,
      customBooleanAttribute: true
    }
  }

  const serializedPayload = prepareHarvest()

  console.log('serializedPayload', serializedPayload)

  const decoded = qp.decode(serializedPayload.body.e)

  console.log('decoded', decoded)

  // TODO: specify explicitly that cbTime is NOT included for non-SPA ajax requests

  t.end()
})


