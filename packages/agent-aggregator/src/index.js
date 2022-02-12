import core from 'nr-browser-core'
import errorsAggregator from 'nr-browser-err-aggregate'
import xhrAggregator from 'nr-browser-xhr-aggregate'
import { config } from 'nr-browser-utils'

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
