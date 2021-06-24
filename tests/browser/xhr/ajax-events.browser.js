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
  const getStoredEvents = require('../../../feature/xhr/aggregate/index').getStoredEvents

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

  console.log('spaAjaxEvents', getStoredEvents())
  // TODO: add validation

  t.end()
})

test('storeXhr for a non-SPA ajax request buffers in ajaxEvents', function (t) {
  const loader = require('loader')
  loader.features.xhr = true
  
  const storeXhr = require('../../../feature/xhr/aggregate/index')
  const getStoredEvents = require('../../../feature/xhr/aggregate/index').getStoredEvents

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

  console.log('stored events', getStoredEvents())
  // TODO: add validation

  t.end()
})

// TODO: multiple ajax events receive the same custom attributes
test('prepareHarvest correctly serializes an AjaxRequest events payload', function (t) {
  const loader = require('loader')
  loader.features.xhr = true
  
  const storeXhr = require('../../../feature/xhr/aggregate/index')
  const getStoredEvents = require('../../../feature/xhr/aggregate/index').getStoredEvents
  const prepareHarvest = require('../../../feature/xhr/aggregate/index').prepareHarvest

  const context = {
    spaNode: undefined
  }

  const ajaxEvent = [
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
    30, // endTime
    'XMLHttpRequest' // type
  ]
  
  storeXhr.apply(context, ajaxEvent)

  loader.info = {
    jsAttributes: {
      customStringAttribute: 'customStringAttribute',
      customNumAttribute: 2,
      customBooleanAttribute: true
    }
  }

  const serializedPayload = prepareHarvest({retry: false})

  console.log('serializedPayload', serializedPayload)

  const decoded = qp.decode(serializedPayload.body.e)

  console.log('decoded', decoded)

  // TODO: specify explicitly that cbTime is NOT included for non-SPA ajax requests

  t.end()
})


