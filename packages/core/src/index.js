var now = require('nr-browser-common').now
var handle = require('nr-browser-common').handle
var config = require('nr-browser-common').config

if (require('./ie-version') === 6) config.runtime.maxBytes = 2000
else config.runtime.maxBytes = 30000

module.exports = {
  setConfiguration: config.setConfiguration,
  init: initialize,
  recordError: recordError,
  recordPageAction: recordPageAction,
  internal: {
    aggregator: require('./aggregator'),
    harvest: require('./harvest'),
    harvestScheduler: require('./harvest-scheduler'),
    registerHandler: require('./register-handler'),
    stringify: require('./stringify')
  }
}

function initialize(opts) {
  config.setInfo(opts)
  if (opts.plugins) {
    opts.plugins.forEach(function(plugin) {
      plugin.initialize()
    })
  }
}

function recordError(err, customAttributes, time) {
  time = time || now()
  handle('err', [err, time, false, customAttributes])
}

function recordPageAction() {

}
