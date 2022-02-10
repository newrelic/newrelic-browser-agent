if (!window.NREUM) {
  window.NREUM = {}
}

var config = require('./config')
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

var ee = require('./contextual-ee')
ee.on('internal-error', function() {
  console.log('internal error', arguments)
})

ee.global.on('internal-error', function() {
  console.log('internal error (global)', arguments)
})

module.exports = {
  cleanUrl: require('./clean-url'),
  config: require('./config'),
  ds: require('./data-size'),
  ee: require('./contextual-ee'),
  eventListenerOpts: require('./event-listener-opts'),
  getOrSet: require('./get-or-set'),
  handle: require('./handle'),
  location: require('./location'),
  mapOwn: require('./map-own'),
  metrics: require('./metrics'),
  now: require('./now'),
  performanceCheck: require('./performance-check'),
  reduce: require('./reduce'),
  wrap: require('./wrap')
}
