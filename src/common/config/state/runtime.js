import * as userAgent from '../../util/user-agent'
import { Configurable } from './configurable'
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { globalScope } from '../../util/global-scope'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../../constants/env'
import { SessionEntity } from '../../session/session-entity'

const model = {
  buildEnv: BUILD_ENV,
  bytesSent: {},
  customTransaction: undefined,
  disabled: false,
  distMethod: DIST_METHOD,
  isolatedBacklog: false,
  loaderType: undefined,
  maxBytes: 30000,
  // The "timeOrigin" property is the new standard timestamp property shared across main frame and workers, but is not supported in some early Safari browsers (safari<15) + IE
  // ingest expects an integer value, and timeOrigin can return a float.
  offset: Math.floor(globalScope?.performance?.timeOrigin || globalScope?.performance?.timing?.navigationStart || Date.now()),
  onerror: undefined,
  origin: '' + globalScope.location,
  ptid: undefined,
  releaseIds: {},
  session: undefined,
  xhrWrappable: typeof globalScope.XMLHttpRequest?.prototype?.addEventListener === 'function',
  userAgent,
  version: VERSION
}

const _cache = {}

export function getRuntime (id) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Runtime for ${id} was never set`)
  return _cache[id]
}

export function setRuntime (id, obj) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  _cache[id] = new Configurable(obj, model)
  gosNREUMInitializedAgents(id, _cache[id], 'runtime')
}
