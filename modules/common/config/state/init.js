import { log } from '../../debug/logging'
import { setValues } from './set-values'

const init = {
  privacy: { cookies_enabled: undefined },
  ajax: { deny_list: undefined },
  distributed_tracing: {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  },
  page_view_timing: {enabled: undefined},
  ssl: undefined,
  obfuscate: undefined
}

export function getConfiguration() {
  return init
}

export function setConfiguration(obj) {
  setValues(obj, init, 'config')
}

export function getConfigurationValue(path) {
  var val = init
  var parts = path.split('.')
  for (var i = 0; i < parts.length - 1; i++) {
    val = val[parts[i]]
    if (typeof val !== 'object') return
  }
  val = val[parts[parts.length - 1]]
  log('val...(', path, ')', val)
  return val
}
