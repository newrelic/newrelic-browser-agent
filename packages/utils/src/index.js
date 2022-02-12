import ee, { global as globalEE } from './contextual-ee'

if (!window.NREUM) {
  window.NREUM = {}
}

import config from './config'
// var config = require('./config')
// var wrap = require('./wrap')

var win = window
var XHR = win.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype
var ADD_EVENT_LISTENER = 'addEventListener'

var xhrWrappable = XHR &&
  XHR_PROTO &&
  XHR_PROTO[ADD_EVENT_LISTENER] &&
  !/CriOS/.test(navigator.userAgent)

config.runtime.xhrWrappable = xhrWrappable

// var ee = require('./contextual-ee')
ee.on('internal-error', function() {
  console.log('internal error', arguments)
})

globalEE.on('internal-error', function() {
  console.log('internal error (global)', arguments)
})

export { default as addE } from './add-e'
export { default as aggregator } from './aggregator'
export { default as belSerializer } from './bel-serializer'
export { default as cleanUrl } from './clean-url'
export { default as config } from './config'
export { default as ee } from './contextual-ee'
export { default as dataSize } from './data-size'
export { default as drain } from './drain'
export { default as encode } from './encode'
export { default as eventListenerOpts } from './event-listener-opts'
export { default as firefoxVersion } from './firefox-version'
export { default as getOrSet } from './get-or-set'
export { default as handle } from './handle'
export { default as harvest } from './harvest'
export { default as HarvestScheduler } from './harvest-scheduler'
export { default as id } from './id'
export { default as ieVersion } from './ie-version'
export { default as location } from './location'
export { default as mapOwn } from './map-own'
export { default as metrics } from './metrics'
export { default as now } from './now'
export { default as performanceCheck } from './performance-check'
export { default as protocolAllowed } from './protocol-allowed'
export { default as reduce } from './reduce'
export { default as registerHandler } from './register-handler'
export { default as single } from './single'
export { default as stringify } from './stringify'
export { default as submitData } from './submit-data'
export { default as uniqueId } from './unique-id'
export { default as unload } from './unload'
export { default as userAgent } from './user-agent'
