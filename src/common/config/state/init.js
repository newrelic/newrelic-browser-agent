import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS } from '../../session/constants'
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { getModeledObject } from './configurable'

const model = () => {
  const hiddenState = {
    blockSelector: '[data-nr-block]',
    maskInputOptions: { password: true }
  }
  return {
    allow_bfcache: true, // *cli - temporary feature flag for BFCache work
    privacy: { cookies_enabled: true }, // *cli - per discussion, default should be true
    ajax: { deny_list: undefined, block_internal: true, enabled: true, harvestTimeSeconds: 10 },
    distributed_tracing: {
      enabled: undefined,
      exclude_newrelic_header: undefined,
      cors_use_newrelic_header: undefined,
      cors_use_tracecontext_headers: undefined,
      allowed_origins: undefined
    },
    session: {
      domain: undefined, // used by first party cookies to set the top-level domain
      expiresMs: DEFAULT_EXPIRES_MS,
      inactiveMs: DEFAULT_INACTIVE_MS
    },
    ssl: undefined,
    obfuscate: undefined,
    jserrors: { enabled: true, harvestTimeSeconds: 10 },
    metrics: { enabled: true },
    page_action: { enabled: true, harvestTimeSeconds: 30 },
    page_view_event: { enabled: true },
    page_view_timing: { enabled: true, harvestTimeSeconds: 30, long_task: false },
    session_trace: { enabled: true, harvestTimeSeconds: 10 },
    harvest: { tooManyRequestsDelay: 60 },
    session_replay: {
      // feature settings
      enabled: false,
      harvestTimeSeconds: 60,
      sampleRate: 0.1,
      errorSampleRate: 0.1,
      // recording config settings
      maskTextSelector: '*',
      maskAllInputs: true,
      // these properties only have getters because they are enforcable constants and should error if someone tries to override them
      get blockClass () { return 'nr-block' },
      get ignoreClass () { return 'nr-ignore' },
      get maskTextClass () { return 'nr-mask' },
      // props with a getter and setter are used to extend enforcable constants with customer input
      // we must preserve data-nr-block no matter what else the customer sets
      get blockSelector () {
        return hiddenState.blockSelector
      },
      set blockSelector (val) {
        hiddenState.blockSelector += `,${val}`
      },
      // password: must always be present and true no matter what customer sets
      get maskInputOptions () {
        return hiddenState.maskInputOptions
      },
      set maskInputOptions (val) {
        hiddenState.maskInputOptions = { ...val, password: true }
      }
    },
    spa: { enabled: true, harvestTimeSeconds: 10 }
  }
}

const _cache = {}
const missingAgentIdError = 'All configuration objects require an agent identifier!'

export function getConfiguration (id) {
  if (!id) throw new Error(missingAgentIdError)
  if (!_cache[id]) throw new Error(`Configuration for ${id} was never set`)
  return _cache[id]
}

export function setConfiguration (id, obj) {
  if (!id) throw new Error(missingAgentIdError)
  _cache[id] = getModeledObject(obj, model())
  gosNREUMInitializedAgents(id, _cache[id], 'config')
}

export function getConfigurationValue (id, path) {
  if (!id) throw new Error(missingAgentIdError)
  var val = getConfiguration(id)
  if (val) {
    var parts = path.split('.')
    for (var i = 0; i < parts.length - 1; i++) {
      val = val[parts[i]]
      if (typeof val !== 'object') return
    }
    val = val[parts[parts.length - 1]]
  }
  return val
}

// TO DO: a setConfigurationValue equivalent may be nice so individual
//  properties can be tuned instead of reseting the whole model per call to `setConfiguration(agentIdentifier, {})`
