if (!window.NREUM) {
  window.NREUM = {}
}

var win = window
var XHR = win.XMLHttpRequest

NREUM.o = {
  ST: setTimeout,
  SI: win.setImmediate,
  CT: clearTimeout,
  XHR: XHR,
  REQ: win.Request,
  EV: win.Event,
  PR: win.Promise,
  MO: win.MutationObserver
}

module.exports = {
  cleanUrl: require('./clean-url'),
  config: require('./config'),
  ee: require('./contextual-ee'),
  eventListenerOpts: require('./event-listener-opts'),
  getOrSet: require('./get-or-set'),
  handle: require('./handle'),
  location: require('./location'),
  mapOwn: require('./map-own'),
  now: require('./now'),
  performanceCheck: require('./performance-check'),
  reduce: require('./reduce'),
  wrap: wrap
}

function wrap(apiName) {
  if (apiName === 'events') {
    require('./wrap-events')
  } else if (apiName === 'fetch') {
    require('./wrap-fetch')
  } else if (apiName === 'history') {
    require('./wrap-history')
  } else if (apiName === 'jsonp') {
    require('./wrap-jsonp')
  } else if (apiName === 'mutation') {
    require('./wrap-mutation')
  } else if (apiName === 'promise') {
    require('./wrap-promise')
  } else if (apiName === 'raf') {
    require('./wrap-raf')
  } else if (apiName === 'timer') {
    require('./wrap-timer')
  } else if (apiName === 'xhr') {
    require('./wrap-xhr')
  }  
}
