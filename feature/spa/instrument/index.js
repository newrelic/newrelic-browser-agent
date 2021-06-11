/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var START = '-start'
var END = '-end'
var BODY = '-body'
var FN_START = 'fn' + START
var FN_END = 'fn' + END
var CB_START = 'cb' + START
var CB_END = 'cb' + END
var JS_TIME = 'jsTime'
var FETCH = 'fetch'
var ADD_EVENT_LISTENER = 'addEventListener'

var win = window
var location = win.location

var loader = require('loader')

// loader.xhrWrappable will be false in chrome for ios, but addEventListener is still available.
// sauce does not have a browser to test this case against, so be careful when modifying this check
if (!win[ADD_EVENT_LISTENER] || !loader.xhrWrappable || loader.disabled) return

var mutationEE = require('../../wrap-mutation')
var promiseEE = require('../../wrap-promise')
var historyEE = require('../../wrap-history')
var eventsEE = require('../../wrap-events')
var timerEE = require('../../wrap-timer')
var fetchEE = require('../../wrap-fetch')
var xhrEE = require('../../wrap-xhr')
var jsonpEE = require('../../wrap-jsonp')
var baseEE = require('ee')
var tracerEE = baseEE.get('tracer')

require('../../xhr/instrument')
loader.features.spa = true

// Get after wrapping
var depth = 0
var startHash

baseEE.on(FN_START, startTimestamp)
promiseEE.on(CB_START, startTimestamp)
jsonpEE.on(CB_START, startTimestamp)

function startTimestamp () {
  depth++
  startHash = location.hash
  this[FN_START] = loader.now()
}

baseEE.on(FN_END, endTimestamp)
promiseEE.on(CB_END, endTimestamp)
jsonpEE.on(CB_END, endTimestamp)

function endTimestamp () {
  depth--
  if (location.hash !== startHash) {
    trackURLChange(0, true)
  }

  var time = loader.now()
  this[JS_TIME] = (~~this[JS_TIME]) + time - this[FN_START]
  this[FN_END] = time
}

baseEE.buffer([FN_START, FN_END, 'xhr-done', 'xhr-resolved'])
eventsEE.buffer([FN_START])
timerEE.buffer(['setTimeout' + END, 'clearTimeout' + START, FN_START])
xhrEE.buffer([FN_START, 'new-xhr', 'send-xhr' + START])
fetchEE.buffer([FETCH + START, FETCH + '-done', FETCH + BODY + START, FETCH + BODY + END])
historyEE.buffer(['newURL'])
mutationEE.buffer([FN_START])
promiseEE.buffer(['propagate', CB_START, CB_END, 'executor-err', 'resolve' + START])
tracerEE.buffer([FN_START, 'no-' + FN_START])
jsonpEE.buffer(['new-jsonp', 'cb-start', 'jsonp-error', 'jsonp-end'])

timestamp(xhrEE, 'send-xhr' + START) // TODO: use timestamp from xhr instrumentation instead
timestamp(baseEE, 'xhr-resolved') // TODO: use timestamp from xhr instrumentation instead
timestamp(baseEE, 'xhr-done') // ? looks like this is not used
timestamp(fetchEE, FETCH + START)
timestamp(fetchEE, FETCH + '-done')
timestamp(jsonpEE, 'new-jsonp')
timestamp(jsonpEE, 'jsonp-end')
timestamp(jsonpEE, 'cb-start')

historyEE.on('pushState-end', trackURLChange)
historyEE.on('replaceState-end', trackURLChange)

function trackURLChange (unusedArgs, hashChangedDuringCb) {
  historyEE.emit('newURL', ['' + location, hashChangedDuringCb])
}

win[ADD_EVENT_LISTENER]('hashchange', trackURLChange, true)
win[ADD_EVENT_LISTENER]('load', trackURLChange, true)

win[ADD_EVENT_LISTENER]('popstate', function () {
  trackURLChange(0, depth > 1)
}, true)

function timestamp (ee, type) {
  ee.on(type, function () {
    this[type] = loader.now()
  })
}
