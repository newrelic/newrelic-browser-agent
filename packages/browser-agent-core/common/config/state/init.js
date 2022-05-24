
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { Configurable } from './configurable'

const model = {
  privacy: { cookies_enabled: undefined },
  ajax: { deny_list: undefined },
  distributed_tracing: {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  },
  page_view_timing: { enabled: undefined },
  ssl: undefined,
  obfuscate: undefined
}

const _cache = {}

export function getConfiguration(id) {
  if (!id) throw new Error('All config objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Configuration for ${id} was never set`)
  return _cache[id]
}

export function setConfiguration(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!')
  _cache[id] = new Configurable(obj, model)
  gosNREUMInitializedAgents(id, _cache[id], 'config')
}

export function getConfigurationValue(id, path) {
  if (!id) throw new Error('All config objects require an agent identifier!')
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
