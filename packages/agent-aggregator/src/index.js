var core = require('nr-browser-core')
var errorsAggregator = require('nr-browser-err-aggregate')
var xhrAggregator = require('nr-browser-xhr-aggregate')
var config = require('nr-browser-common').config

// set configuration from global NREUM
if (NREUM && NREUM.info) {
  config.setInfo(NREUM.info)
}

if (NREUM && NREUM.init) {
  config.setConfiguration(NREUM.init)
}

errorsAggregator.initialize(true)
xhrAggregator.initialize(true)

core.internal.drain.global('api')
core.internal.drain.global('feature')
