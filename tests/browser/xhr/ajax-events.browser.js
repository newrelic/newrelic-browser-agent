/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const test = require('../../../tools/jil/browser-test')
const qp = require('@newrelic/nr-querypack')
const baseEE = require('ee')

const loader = require('loader')
loader.features.xhr = true
loader.info = {}
loader.maxPayloadSize = 500

const storeXhr = require('../../../feature/xhr/aggregate/index')
const getStoredEvents = require('../../../feature/xhr/aggregate/index').getStoredEvents
const prepareHarvest = require('../../../feature/xhr/aggregate/index').prepareHarvest

function exceedsSizeLimit(payload) {
  return new Blob([payload]).size > loader.maxPayloadSize
}

test('storeXhr for a SPA ajax request buffers in spaAjaxEvents', function (t) {
  const interaction = { id: 0 }
  const context = {
    spaNode: { interaction: interaction }
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

  const events = getStoredEvents()
  const interactionAjaxEvents = events.spaAjaxEvents[interaction.id]
  t.ok(interactionAjaxEvents.length === 1, 'SPA ajax requests are buffered and associated in spaAjaxEvents by interaction id')
  t.notok(events.ajaxEvents.length > 0, 'SPA ajax requests are not buffered in ajaxEvents')

  const spaAjaxEvent = interactionAjaxEvents[0]
  t.ok(spaAjaxEvent.startTime === 0 && spaAjaxEvent.path === '/pathname', 'expected SPA ajax event is buffered')

  // clear spaAjaxEvents
  baseEE.emit('interactionSaved', [interaction])

  t.end()
})

test('storeXhr for a non-SPA ajax request buffers in ajaxEvents', function (t) {
  const context = { spaNode: undefined }
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

  const events = getStoredEvents()
  t.ok(events.ajaxEvents.length === 1, 'non-SPA ajax requests are buffered in ajaxEvents')
  t.notok(Object.keys(events.spaAjaxEvents).length > 0, 'non-SPA ajax requests are not buffered in spaAjaxEvents')

  const ajaxEvent = events.ajaxEvents[0]
  t.ok(ajaxEvent.startTime === 0 && ajaxEvent.path === '/pathname', 'expected ajax event is buffered')

  // clear ajaxEvents buffer
  prepareHarvest({ retry: false })

  t.end()
})

test('on interactionDiscarded, saved SPA events are buffered in ajaxEvents', function (t) {
  const interaction = { id: 0 }
  const context = {
    spaNode: { interaction: interaction }
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
  baseEE.emit('interactionDiscarded', [interaction])

  const events = getStoredEvents()

  // no interactions in SPA under interaction 0
  t.notok(events.spaAjaxEvents[interaction.id], 'ajax requests from discarded interaction no longer held buffer')
  t.ok(events.ajaxEvents.length === 1, 'ajax request buffered as non-SPA')

  // clear ajaxEvents buffer
  prepareHarvest({ retry: false })

  t.end()
})

test('prepareHarvest correctly serializes an AjaxRequest events payload', function (t) {
  const context = { spaNode: undefined }
  const expected = {
    type: 'ajax',
    start: 0,
    end: 30,
    callbackEnd: 30,
    callbackDuration: 0,
    domain: 'https://example.com',
    path: '/pathname',
    method: 'PUT',
    status: 200,
    requestedWith: 'XMLHttpRequest',
    requestBodySize: 128,
    responseBodySize: 256,
    nodeId: '0',
    guid: null,
    traceId: null,
    timestamp: null
  }
  const ajaxEvent = [
    { // params
      method: expected.method,
      status: expected.status,
      host: expected.domain,
      pathname: expected.path
    },
    { // metrics
      txSize: expected.requestBodySize,
      rxSize: expected.responseBodySize,
      cbTime: expected.callbackDuration
    },
    expected.start,
    expected.end,
    expected.requestedWith
  ]

  storeXhr.apply(context, ajaxEvent)
  storeXhr.apply(context, ajaxEvent)

  const expectedCustomAttributes = {
    customStringAttribute: 'customStringAttribute',
    customNumAttribute: 2,
    customBooleanAttribute: true,
    undefinedCustomAttribute: undefined
  }
  const expectedCustomAttrCount = Object.keys(expectedCustomAttributes).length

  loader.info = {
    jsAttributes: expectedCustomAttributes
  }

  const serializedPayload = prepareHarvest({retry: false})
  // serializedPayload from ajax comes back as an array of bodies now, so we just need to decode each one and flatten
  // this decoding does not happen elsewhere in the app so this only needs to happen here in this specific test
  const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e)).flat()

  decodedEvents.forEach(event => {
    t.equal(event.children.length, expectedCustomAttrCount, 'ajax event has expected number of custom attributes')

    // validate custom attribute values
    event.children.forEach(attribute => {
      switch (attribute.type) {
        case 'stringAttribute':
        case 'doubleAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === attribute.value, 'string & num custom attributes encoded')
          break
        case 'trueAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === true, 'true custom attribute encoded')
          break
        case 'falseAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === false, 'false custom attribute encoded')
          break
        case 'nullAttribute':
          // undefined is treated as null in querypack
          t.ok(expectedCustomAttributes[attribute.key] === undefined, 'undefined custom attributes encoded')
          break
        default:
          t.fail('unexpected custom attribute type')
      }
    })
    delete event.children

    t.deepEqual(event, expected, 'event attributes serialized correctly')
  })

  // clear ajaxEventsBuffer
  prepareHarvest()

  t.end()
})

test('prepareHarvest correctly serializes a very large AjaxRequest events payload', function (t) {
  const context = { spaNode: undefined }
  let callNo = 0
  const expected = () => ({
    type: 'ajax',
    start: 0,
    end: 30,
    callbackEnd: 30,
    callbackDuration: 0,
    domain: 'https://example.com',
    path: `/pathname/${callNo}`,
    method: 'PUT',
    status: 200,
    requestedWith: 'XMLHttpRequest',
    requestBodySize: 128,
    responseBodySize: 256,
    nodeId: '0',
    guid: null,
    traceId: null,
    timestamp: null
  })
  const ajaxEvent = () => [
    { // params
      method: expected().method,
      status: expected().status,
      host: expected().domain,
      pathname: expected().path
    },
    { // metrics
      txSize: expected().requestBodySize,
      rxSize: expected().responseBodySize,
      cbTime: expected().callbackDuration
    },
    expected().start,
    expected().end,
    expected().requestedWith
  ]

  for (var i = 0; i < 100; i++) {
    storeXhr.apply(context, ajaxEvent())
    callNo++
  }

  const expectedCustomAttributes = {
    customStringAttribute: 'customStringAttribute',
    customNumAttribute: 2,
    customBooleanAttribute: true,
    undefinedCustomAttribute: undefined
  }

  loader.info = {
    jsAttributes: expectedCustomAttributes
  }

  const serializedPayload = prepareHarvest({retry: false})

  // we just want to check that the list of AJAX events to be sent contains multiple items because it exceeded the allowed byte limit,
  // and that each list item is smaller than the limit
  t.ok(serializedPayload.length > 1, 'Large Payload of AJAX Events are broken into multiple chunks (' + serializedPayload.length + ')')
  t.ok(serializedPayload.every(sp => !exceedsSizeLimit(sp)), 'All AJAX chunks are less than the maxPayloadSize property (' + loader.maxPayloadSize + ')')

  console.log('serializedPayload', serializedPayload)
  const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e)).flat()

  console.log('decodedEvents', decodedEvents)

  decodedEvents.forEach((event, idx) => {
    console.log('event', event)
    t.ok(event.path.includes(idx), idx + ' - chunked string path includes the number it was indexed to')

    event.children.forEach(attribute => {
      console.log('attribute', attribute)
      switch (attribute.type) {
        case 'stringAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === attribute.value, idx + ' - chunked string attributes are valid')
          break
        case 'doubleAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === attribute.value, idx + ' - chunked string & num custom attributes encoded')
          break
        case 'trueAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === true, idx + ' - chunked true custom attribute encoded')
          break
        case 'falseAttribute':
          t.ok(expectedCustomAttributes[attribute.key] === false, idx + ' - chunked false custom attribute encoded')
          break
        case 'nullAttribute':
          // undefined is treated as null in querypack
          t.ok(expectedCustomAttributes[attribute.key] === undefined, idx + ' - chunked undefined custom attributes encoded')
          break
        default:
          t.fail(idx + ' - chunked unexpected custom attribute type')
      }
    })
  })

  // clear ajaxEventsBuffer
  prepareHarvest()

  t.end()
})

test('prepareHarvest does not chunk a very large AjaxRequest events payload if Blob is not supported', function (t) {
  const context = { spaNode: undefined }
  window.Blob = undefined
  let callNo = 0
  const expected = () => ({
    type: 'ajax',
    start: 0,
    end: 30,
    callbackEnd: 30,
    callbackDuration: 0,
    domain: 'https://example.com',
    path: `/pathname/${callNo}`,
    method: 'PUT',
    status: 200,
    requestedWith: 'XMLHttpRequest',
    requestBodySize: 128,
    responseBodySize: 256,
    nodeId: '0',
    guid: null,
    traceId: null,
    timestamp: null
  })
  const ajaxEvent = () => [
    { // params
      method: expected().method,
      status: expected().status,
      host: expected().domain,
      pathname: expected().path
    },
    { // metrics
      txSize: expected().requestBodySize,
      rxSize: expected().responseBodySize,
      cbTime: expected().callbackDuration
    },
    expected().start,
    expected().end,
    expected().requestedWith
  ]

  for (var i = 0; i < 100; i++) {
    storeXhr.apply(context, ajaxEvent())
    callNo++
  }

  const expectedCustomAttributes = {
    customStringAttribute: 'customStringAttribute',
    customNumAttribute: 2,
    customBooleanAttribute: true,
    undefinedCustomAttribute: undefined
  }

  loader.info = {
    jsAttributes: expectedCustomAttributes
  }

  const serializedPayload = prepareHarvest({retry: false})

  // we just want to check that the list of AJAX events to be sent contains multiple items because it exceeded the allowed byte limit,
  // and that each list item is smaller than the limit
  t.ok(serializedPayload.length === 1, 'Large Payload of AJAX Events are NOT broken into multiple chunks (' + serializedPayload.length + ')')

  // clear ajaxEventsBuffer
  prepareHarvest()

  t.end()
})
