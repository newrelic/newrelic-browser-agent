import { ee, global as globalEE } from './event-emitter/contextual-ee'

if (!window.NREUM) {
  window.NREUM = {}
}

import { runtime } from './config/config'

var win = window
var XHR = win.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype
var ADD_EVENT_LISTENER = 'addEventListener'

var xhrWrappable = XHR &&
  XHR_PROTO &&
  XHR_PROTO[ADD_EVENT_LISTENER] &&
  !/CriOS/.test(navigator.userAgent)

runtime.xhrWrappable = xhrWrappable

// var ee = require('./contextual-ee')
ee.on('internal-error', function() {
  console.log('internal error', arguments)
})

globalEE.on('internal-error', function() {
  console.log('internal error (global)', arguments)
})

export { default as addE } from './event-listener/add-e'
export { default as aggregator } from './aggregate/aggregator'
export { default as belSerializer } from './serialize/bel-serializer'
export { default as cleanUrl } from './url/clean-url'
export { default as config } from './config/config'
export { default as ee } from './event-emitter/contextual-ee'
export { default as dataSize } from './util/data-size'
export { default as drain } from './drain/drain'
export { default as encode } from './url/encode'
export { default as eventListenerOpts } from './event-listener-opts'
export { default as firefoxVersion } from './browser-version/firefox-version'
export { default as getOrSet } from './util/get-or-set'
export { default as handle } from './event-emitter/handle'
export { default as harvest } from './harvest'
export { default as HarvestScheduler } from './harvest-scheduler'
export { default as id } from './ids/id'
export { default as ieVersion } from './browser-version/ie-version'
export { default as location } from './location'
export { default as mapOwn } from './util/map-own'
export { default as metrics } from './metrics/metrics'
export { default as now } from './now'
export { default as performanceCheck } from './performance-check'
export { default as protocolAllowed } from './url/protocol-allowed'
export { default as reduce } from './util/reduce'
export { default as registerHandler } from './event-emitter/register-handler'
export { default as single } from './util/single'
export { default as stringify } from './util/stringify'
export { default as submitData } from './util/submit-data'
export { default as uniqueId } from './unique-id'
export { default as unload } from './unload/unload'
export { default as userAgent } from './util/user-agent'
