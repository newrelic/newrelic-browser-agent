
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { Configurable } from './configurable'

const model = {
  privacy: { cookies_enabled: true }, // *cli - per discussion, default should be true
  ajax: { deny_list: undefined, enabled: true, auto: true, harvestTimeSeconds: 10 },
  distributed_tracing: {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  },
  ssl: undefined,
  obfuscate: undefined,
  jserrors: {enabled: true, auto: true, harvestTimeSeconds: 10},
  metrics: {enabled: true, auto: true},
  page_action: {enabled: true, auto: false, harvestTimeSeconds: 30},
  page_view_event: {enabled: true, auto: true},
  page_view_timing: {enabled: true, auto: true, harvestTimeSeconds: 30},
  session_trace: {enabled: true, auto: true, harvestTimeSeconds: 10},
  spa: {enabled: true, auto: true, harvestTimeSeconds: 10}
}

const _cache = {}

export function getConfiguration(id) {
  if (!id) throw new Error('All configuration objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Configuration for ${id} was never set`)
  return _cache[id]
}

export function setConfiguration(id, obj) {
  if (!id) throw new Error('All configuration objects require an agent identifier!')
  _cache[id] = new Configurable(obj, model)
  gosNREUMInitializedAgents(id, _cache[id], 'config')
}

export function getConfigurationValue(id, path) {
  if (!id) throw new Error('All configuration objects require an agent identifier!')
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