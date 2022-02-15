import { now } from 'nr-browser-common/src/timing/now'
import { handle } from 'nr-browser-common/src/event-emitter/handle'
import { runtime, getConfiguration, setConfiguration, setInfo } from 'nr-browser-common/src/config/config'
import { ieVersion } from 'nr-browser-common/src/browser-version/ie-version'

// if (require('./ie-version') === 6) runtime.maxBytes = 2000
if (ieVersion === 6) runtime.maxBytes = 2000
else runtime.maxBytes = 30000

let initialized = false

// import core
// import err-agg
// core.plugin = err-agg

// import core
// core <decides> if import err-agg
// core initializes err-agg

const nr = {
  getConfiguration,
  setConfiguration,
  init: initialize,
  recordError,
  recordPageAction
}

export default nr

// TODO: the internal exports are intended for exposing modules to other packages,
// while non-internal exports are intended as APIs that user-code would interact with
// perhaps core should be a light package with just the API, and the other modules
// could go to another package. Whether they should go to common or not, however,
// depends on whether we still need to keep the loader bundle as small as possible.
// export default nr

export { initialize as init }

async function initialize(opts) {
  console.log('initialize!')
  if (initialized) return
  setInfo(opts)

  if (!initialized && !opts.hasOwnProperty('disable') || (opts.hasOwnProperty('disable') && !opts.disable.includes('errors'))) {
    const { storeError, ...errors } = await import('nr-browser-err-aggregate')
    nr.storeError = storeError
    console.log('set store error!', nr)
    errors.initialize(true)
  }

  initialized = true
  // if (opts.plugins) {
  //   opts.plugins.forEach(function(plugin) {
  //     plugin.initialize()
  //   })
  // }
}

export function recordError(err, customAttributes, time) {
  time = time || now()
  handle('err', [err, time, false, customAttributes])
}

export function recordPageAction() {

}
