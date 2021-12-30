/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var loader = require('loader')

// Don't instrument Chrome for iOS, it is buggy and acts like there are URL verification issues
if (!loader.xhrWrappable || loader.disabled) return

var handle = require('handle')
var parseUrl = require('./parse-url.js')
var generateTracePayload = require('./distributed-tracing.js').generateTracePayload
var ee = require('ee')
var handlers = [ 'load', 'error', 'abort', 'timeout' ]
var handlersLen = handlers.length
var id = require('../../../loader/id')
var ffVersion = require('../../../loader/firefox-version')
var dataSize = require('ds')
var responseSizeFromXhr = require('./response-size')
var eventListenerOpts = require('event-listener-opts')
var recordSupportability = require('metrics').recordSupportability

var origRequest = NREUM.o.REQ
var origXHR = window.XMLHttpRequest

// Declare that we are using xhr instrumentation
loader.features.xhr = true

require('../../wrap-xhr')
require('../../wrap-fetch')

// Setup the context for each new xhr object
ee.on('new-xhr', function (xhr) {
  var ctx = this
  ctx.totalCbs = 0
  ctx.called = 0
  ctx.cbTime = 0
  ctx.end = end
  ctx.ended = false
  ctx.xhrGuids = {}
  ctx.lastSize = null
  ctx.loadCaptureCalled = false
  ctx.params = this.params || {}
  ctx.metrics = this.metrics || {}

  xhr.addEventListener('load', function (event) {
    captureXhrData(ctx, xhr)
  }, eventListenerOpts(false))

  // In Firefox 34+, XHR ProgressEvents report pre-content-decoding sizes via
  // their 'loaded' property, rather than post-decoding sizes. We want
  // post-decoding sizes for consistency with browsers where that's all we have.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1227674
  //
  // In really old versions of Firefox (older than somewhere between 5 and 10),
  // we don't reliably get a final XHR ProgressEvent which reflects the full
  // size of the transferred resource.
  //
  // So, in both of these cases, we fall back to not using ProgressEvents to
  // measure XHR sizes.

  if (ffVersion && (ffVersion > 34 || ffVersion < 10)) return

  xhr.addEventListener('progress', function (event) {
    ctx.lastSize = event.loaded
  }, eventListenerOpts(false))
})

ee.on('open-xhr-start', function (args) {
  this.params = { method: args[0] }
  addUrl(this, args[1])
  this.metrics = {}
})

ee.on('open-xhr-end', function (args, xhr) {
  if ('loader_config' in NREUM && 'xpid' in NREUM.loader_config && this.sameOrigin) {
    xhr.setRequestHeader('X-NewRelic-ID', NREUM.loader_config.xpid)
  }

  var payload = generateTracePayload(this.parsedOrigin)
  if (payload) {
    var added = false
    if (payload.newrelicHeader) {
      xhr.setRequestHeader('newrelic', payload.newrelicHeader)
      added = true
    }
    if (payload.traceContextParentHeader) {
      xhr.setRequestHeader('traceparent', payload.traceContextParentHeader)
      if (payload.traceContextStateHeader) {
        xhr.setRequestHeader('tracestate', payload.traceContextStateHeader)
      }
      added = true
    }
    if (added) {
      this.dt = payload
    }
  }
})

ee.on('send-xhr-start', function (args, xhr) {
  var metrics = this.metrics
  var data = args[0]
  var context = this

  if (metrics && data) {
    var size = dataSize(data)
    if (size) metrics.txSize = size
  }

  this.startTime = loader.now()

  this.listener = function (evt) {
    try {
      if (evt.type === 'abort' && !(context.loadCaptureCalled)) {
        context.params.aborted = true
      }
      if (evt.type !== 'load' || (context.called === context.totalCbs) && (context.onloadCalled || typeof (xhr.onload) !== 'function')) context.end(xhr)
    } catch (e) {
      try {
        ee.emit('internal-error', [e])
      } catch (err) {}
    }
  }

  for (var i = 0; i < handlersLen; i++) {
    xhr.addEventListener(handlers[i], this.listener, eventListenerOpts(false))
  }
})

ee.on('xhr-cb-time', function (time, onload, xhr) {
  this.cbTime += time
  if (onload) this.onloadCalled = true
  else this.called += 1
  if ((this.called === this.totalCbs) && (this.onloadCalled || typeof (xhr.onload) !== 'function')) this.end(xhr)
})

ee.on('xhr-load-added', function (cb, useCapture) {
  // Ignore if the same arguments are passed to addEventListener twice
  var idString = '' + id(cb) + !!useCapture
  if (!this.xhrGuids || this.xhrGuids[idString]) return
  this.xhrGuids[idString] = true

  this.totalCbs += 1
})

ee.on('xhr-load-removed', function (cb, useCapture) {
  // Ignore if event listener didn't exist for this xhr object
  var idString = '' + id(cb) + !!useCapture
  if (!this.xhrGuids || !this.xhrGuids[idString]) return
  delete this.xhrGuids[idString]

  this.totalCbs -= 1
})

ee.on('xhr-resolved', function() {
  this.endTime = loader.now()
})

// Listen for load listeners to be added to xhr objects
ee.on('addEventListener-end', function (args, xhr) {
  if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-added', [args[1], args[2]], xhr)
})

ee.on('removeEventListener-end', function (args, xhr) {
  if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-removed', [args[1], args[2]], xhr)
})

// Listen for those load listeners to be called.
ee.on('fn-start', function (args, xhr, methodName) {
  if (xhr instanceof origXHR) {
    if (methodName === 'onload') this.onload = true
    if ((args[0] && args[0].type) === 'load' || this.onload) this.xhrCbStart = loader.now()
  }
})

ee.on('fn-end', function (args, xhr) {
  if (this.xhrCbStart) ee.emit('xhr-cb-time', [loader.now() - this.xhrCbStart, this.onload, xhr], xhr)
})

// this event only handles DT
ee.on('fetch-before-start', function (args) {
  var opts = args[1] || {}
  var url
  // argument is USVString
  if (typeof args[0] === 'string') {
    url = args[0]
  // argument is Request object
  } else if (args[0] && args[0].url) {
    url = args[0].url
  // argument is URL object
  } else if (window.URL && args[0] && args[0] instanceof URL) {
    url = args[0].href
  }

  if (url) {
    this.parsedOrigin = parseUrl(url)
    this.sameOrigin = this.parsedOrigin.sameOrigin
  }

  var payload = generateTracePayload(this.parsedOrigin)
  if (!payload || (!payload.newrelicHeader && !payload.traceContextParentHeader)) {
    return
  }

  if (typeof args[0] === 'string' || (window.URL && args[0] && args[0] instanceof URL)) {
    var clone = {}

    for (var key in opts) {
      clone[key] = opts[key]
    }

    clone.headers = new Headers(opts.headers || {})
    if (addHeaders(clone.headers, payload)) {
      this.dt = payload
    }

    if (args.length > 1) {
      args[1] = clone
    } else {
      args.push(clone)
    }
  } else if (args[0] && args[0].headers) {
    if (addHeaders(args[0].headers, payload)) {
      this.dt = payload
    }
  }

  function addHeaders(headersObj, payload) {
    var added = false
    if (payload.newrelicHeader) {
      headersObj.set('newrelic', payload.newrelicHeader)
      added = true
    }
    if (payload.traceContextParentHeader) {
      headersObj.set('traceparent', payload.traceContextParentHeader)
      if (payload.traceContextStateHeader) {
        headersObj.set('tracestate', payload.traceContextStateHeader)
      }
      added = true
    }
    return added
  }
})

ee.on('fetch-start', function (fetchArguments, dtPayload) {
  this.params = {}
  this.metrics = {}
  this.startTime = loader.now()
  this.dt = dtPayload

  if (fetchArguments.length >= 1) this.target = fetchArguments[0]
  if (fetchArguments.length >= 2) this.opts = fetchArguments[1]

  var opts = this.opts || {}
  var target = this.target

  var url
  if (typeof target === 'string') {
    url = target
  } else if (typeof target === 'object' && target instanceof origRequest) {
    url = target.url
  } else if (window.URL && typeof target === 'object' && target instanceof URL) {
    url = target.href
  }
  addUrl(this, url)

  // Do not generate telemetry for Data URL requests because they don't behave like other network requests
  if (this.params.protocol === 'data') return

  var method = ('' + ((target && target instanceof origRequest && target.method) ||
    opts.method || 'GET')).toUpperCase()
  this.params.method = method

  this.txSize = dataSize(opts.body) || 0
})

// we capture failed call as status 0, the actual error is ignored
// eslint-disable-next-line handle-callback-err
ee.on('fetch-done', function (err, res) {
  this.endTime = loader.now()
  if (!this.params) {
    this.params = {}
  }

  // Do not generate telemetry for Data URL requests because they don't behave like other network requests
  if (this.params.protocol === 'data') {
    recordSupportability('Ajax/DataUrl/Excluded')
    return
  }

  this.params.status = res ? res.status : 0

  // convert rxSize to a number
  var responseSize
  if (typeof this.rxSize === 'string' && this.rxSize.length > 0) {
    responseSize = +this.rxSize
  }

  var metrics = {
    txSize: this.txSize,
    rxSize: responseSize,
    duration: loader.now() - this.startTime
  }

  handle('xhr', [this.params, metrics, this.startTime, this.endTime, 'fetch'], this)
})

// Create report for XHR request that has finished
function end (xhr) {
  var params = this.params
  var metrics = this.metrics

  if (this.ended) return
  this.ended = true

  for (var i = 0; i < handlersLen; i++) {
    xhr.removeEventListener(handlers[i], this.listener, false)
  }

  // Do not generate telemetry for Data URL requests because they don't behave like other network requests
  if (params.protocol && params.protocol === 'data') {
    recordSupportability('Ajax/DataUrl/Excluded')
    return
  }

  if (params.aborted) return
  metrics.duration = loader.now() - this.startTime
  if (!this.loadCaptureCalled && xhr.readyState === 4) {
    captureXhrData(this, xhr)
  } else if (params.status == null) {
    params.status = 0
  }

  // Always send cbTime, even if no noticeable time was taken.
  metrics.cbTime = this.cbTime
  handle('xhr', [params, metrics, this.startTime, this.endTime, 'xhr'], this)
}

function addUrl (ctx, url) {
  var parsed = parseUrl(url)
  var params = ctx.params

  params.hostname = parsed.hostname
  params.port = parsed.port
  params.protocol = parsed.protocol
  params.host = parsed.hostname + ':' + parsed.port
  params.pathname = parsed.pathname
  ctx.parsedOrigin = parsed
  ctx.sameOrigin = parsed.sameOrigin
}

function captureXhrData (ctx, xhr) {
  ctx.params.status = xhr.status

  var size = responseSizeFromXhr(xhr, ctx.lastSize)
  if (size) ctx.metrics.rxSize = size

  if (ctx.sameOrigin) {
    var header = xhr.getResponseHeader('X-NewRelic-App-Data')
    if (header) {
      ctx.params.cat = header.split(', ').pop()
    }
  }

  ctx.loadCaptureCalled = true
}
