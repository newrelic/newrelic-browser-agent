var now = require('nr-browser-common').now
var handle = require('nr-browser-common').handle
var config = require('nr-browser-common').config

if (require('./ie-version') === 6) config.runtime.maxBytes = 2000
else config.runtime.maxBytes = 30000

// TODO: the internal exports are intended for exposing modules to other packages,
// while non-internal exports are intended as APIs that user-code would interact with
// perhaps core should be a light package with just the API, and the other modules
// could go to another package. Whether they should go to common or not, however,
// depends on whether we still need to keep the loader bundle as small as possible.
module.exports = {
  setConfiguration: config.setConfiguration,
  init: initialize,
  recordError: recordError,
  recordPageAction: recordPageAction,
  internal: {
    aggregator: require('./aggregator'),
    drain: require('./drain'),
    harvest: require('./harvest'),
    harvestScheduler: require('./harvest-scheduler'),
    registerHandler: require('./register-handler'),
    stringify: require('./stringify'),
    belSerializer: require('./bel-serializer'),
    unload: require('./unload')
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
