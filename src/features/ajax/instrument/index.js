/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { originals, getLoaderConfig, getRuntime } from '../../../common/config/config'
import { handle } from '../../../common/event-emitter/handle'
import { id } from '../../../common/ids/id'
import { ffVersion } from '../../../common/browser-version/firefox-version'
import { dataSize } from '../../../common/util/data-size'
import { eventListenerOpts } from '../../../common/event-listener/event-listener-opts'
import { now } from '../../../common/timing/now'
import { wrapFetch, wrapXhr } from '../../../common/wrap'
import { parseUrl } from '../../../common/url/parse-url'
import { DT } from './distributed-tracing'
import { responseSizeFromXhr } from './response-size'
import { InstrumentBase } from '../../utils/instrument-base'
import { FEATURE_NAME } from '../constants'
import { FEATURE_NAMES } from '../../../loaders/features/features'
import { globalScope } from '../../../common/util/global-scope'

var handlers = ['load', 'error', 'abort', 'timeout']
var handlersLen = handlers.length

var origRequest = originals.REQ
var origXHR = globalScope.XMLHttpRequest

export class Instrument extends InstrumentBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, FEATURE_NAME, auto)

    // Very unlikely, but in case the existing XMLHttpRequest.prototype object on the page couldn't be wrapped.
    if (!getRuntime(agentIdentifier).xhrWrappable) return

    this.dt = new DT(agentIdentifier)

    this.handler = (type, args, ctx, group) => handle(type, args, ctx, group, this.ee)
    wrapFetch(this.ee)
    wrapXhr(this.ee)
    subscribeToEvents(agentIdentifier, this.ee, this.handler, this.dt)

    this.importAggregator()
  }
}

function subscribeToEvents (agentIdentifier, ee, handler, dt) {
  ee.on('new-xhr', onNewXhr)
  ee.on('open-xhr-start', onOpenXhrStart)
  ee.on('open-xhr-end', onOpenXhrEnd)
  ee.on('send-xhr-start', onSendXhrStart)
  ee.on('xhr-cb-time', onXhrCbTime)
  ee.on('xhr-load-added', onXhrLoadAdded)
  ee.on('xhr-load-removed', onXhrLoadRemoved)
  ee.on('xhr-resolved', onXhrResolved)
  ee.on('addEventListener-end', onAddEventListenerEnd)
  ee.on('removeEventListener-end', onRemoveEventListenerEnd)
  ee.on('fn-end', onFnEnd)
  ee.on('fetch-before-start', onFetchBeforeStart)
  ee.on('fetch-start', onFetchStart)
  ee.on('fn-start', onFnStart)
  ee.on('fetch-done', onFetchDone)

  // Setup the context for each new xhr object
  function onNewXhr (xhr) {
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

    // In Firefox (v34+), XHR ProgressEvents report pre-content-decoding sizes via
    // their 'loaded' property, rather than post-decoding sizes. We want
    // post-decoding sizes for consistency with browsers where that's all we have.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1227674
    //
    // So we don't use ProgressEvents to measure XHR sizes for FF.
    if (ffVersion) return

    xhr.addEventListener('progress', function (event) {
      ctx.lastSize = event.loaded
    }, eventListenerOpts(false))
  }

  function onOpenXhrStart (args) {
    this.params = { method: args[0] }
    addUrl(this, args[1])
    this.metrics = {}
  }

  function onOpenXhrEnd (args, xhr) {
    var loader_config = getLoaderConfig(agentIdentifier)
    if ('xpid' in loader_config && this.sameOrigin) {
      xhr.setRequestHeader('X-NewRelic-ID', loader_config.xpid)
    }

    var payload = dt.generateTracePayload(this.parsedOrigin)
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
  }

  function onSendXhrStart (args, xhr) {
    var metrics = this.metrics
    var data = args[0]
    var context = this

    if (metrics && data) {
      var size = dataSize(data)
      if (size) metrics.txSize = size
    }

    this.startTime = now()

    this.listener = function (evt) {
      try {
        if (evt.type === 'abort' && !(context.loadCaptureCalled)) {
          context.params.aborted = true
        }
        if (evt.type !== 'load' || (context.called === context.totalCbs) && (context.onloadCalled || typeof (xhr.onload) !== 'function') && typeof context.end === 'function') context.end(xhr)
      } catch (e) {
        try {
          ee.emit('internal-error', [e])
        } catch (err) {
          // do nothing
        }
      }
    }

    for (var i = 0; i < handlersLen; i++) {
      xhr.addEventListener(handlers[i], this.listener, eventListenerOpts(false))
    }
  }

  function onXhrCbTime (time, onload, xhr) {
    this.cbTime += time
    if (onload) this.onloadCalled = true
    else this.called += 1
    if ((this.called === this.totalCbs) && (this.onloadCalled || typeof (xhr.onload) !== 'function') && typeof this.end === 'function') this.end(xhr)
  }

  function onXhrLoadAdded (cb, useCapture) {
    // Ignore if the same arguments are passed to addEventListener twice
    var idString = '' + id(cb) + !!useCapture
    if (!this.xhrGuids || this.xhrGuids[idString]) return
    this.xhrGuids[idString] = true

    this.totalCbs += 1
  }

  function onXhrLoadRemoved (cb, useCapture) {
    // Ignore if event listener didn't exist for this xhr object
    var idString = '' + id(cb) + !!useCapture
    if (!this.xhrGuids || !this.xhrGuids[idString]) return
    delete this.xhrGuids[idString]

    this.totalCbs -= 1
  }

  function onXhrResolved () {
    this.endTime = now()
  }

  // Listen for load listeners to be added to xhr objects
  function onAddEventListenerEnd (args, xhr) {
    if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-added', [args[1], args[2]], xhr)
  }

  function onRemoveEventListenerEnd (args, xhr) {
    if (xhr instanceof origXHR && args[0] === 'load') ee.emit('xhr-load-removed', [args[1], args[2]], xhr)
  }

  // Listen for those load listeners to be called.
  function onFnStart (args, xhr, methodName) {
    if (xhr instanceof origXHR) {
      if (methodName === 'onload') this.onload = true
      if ((args[0] && args[0].type) === 'load' || this.onload) this.xhrCbStart = now()
    }
  }

  function onFnEnd (args, xhr) {
    if (this.xhrCbStart) ee.emit('xhr-cb-time', [now() - this.xhrCbStart, this.onload, xhr], xhr)
  }

  // this event only handles DT
  function onFetchBeforeStart (args) {
    var opts = args[1] || {}
    var url
    // argument is USVString
    if (typeof args[0] === 'string') {
      url = args[0]
      // argument is Request object
    } else if (args[0] && args[0].url) {
      url = args[0].url
      // argument is URL object
    } else if (globalScope?.URL && args[0] && args[0] instanceof URL) {
      url = args[0].href
    }

    if (url) {
      this.parsedOrigin = parseUrl(url)
      this.sameOrigin = this.parsedOrigin.sameOrigin
    }

    var payload = dt.generateTracePayload(this.parsedOrigin)
    if (!payload || (!payload.newrelicHeader && !payload.traceContextParentHeader)) {
      return
    }

    if (typeof args[0] === 'string' || (globalScope?.URL && args[0] && args[0] instanceof URL)) {
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

    function addHeaders (headersObj, payload) {
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
  }

  function onFetchStart (fetchArguments, dtPayload) {
    this.params = {}
    this.metrics = {}
    this.startTime = now()
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
    } else if (globalScope?.URL && typeof target === 'object' && target instanceof URL) {
      url = target.href
    }
    addUrl(this, url)

    var method = ('' + ((target && target instanceof origRequest && target.method) ||
      opts.method || 'GET')).toUpperCase()
    this.params.method = method

    this.txSize = dataSize(opts.body) || 0
  }

  // we capture failed call as status 0, the actual error is ignored
  // eslint-disable-next-line handle-callback-err
  function onFetchDone (err, res) {
    this.endTime = now()
    if (!this.params) {
      this.params = {}
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
      duration: now() - this.startTime
    }

    handler('xhr', [this.params, metrics, this.startTime, this.endTime, 'fetch'], this, FEATURE_NAMES.ajax)
  }

  // Create report for XHR request that has finished
  function end (xhr) {
    var params = this.params
    var metrics = this.metrics

    if (this.ended) return
    this.ended = true

    for (var i = 0; i < handlersLen; i++) {
      xhr.removeEventListener(handlers[i], this.listener, false)
    }

    if (params.aborted) return
    metrics.duration = now() - this.startTime
    if (!this.loadCaptureCalled && xhr.readyState === 4) {
      captureXhrData(this, xhr)
    } else if (params.status == null) {
      params.status = 0
    }

    // Always send cbTime, even if no noticeable time was taken.
    metrics.cbTime = this.cbTime

    handler('xhr', [params, metrics, this.startTime, this.endTime, 'xhr'], this, FEATURE_NAMES.ajax)
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
}
