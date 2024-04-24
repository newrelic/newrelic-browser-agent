import { getModeledObject } from './configurable'
import { getNREUMInitializedAgent } from '../../window/nreum'
import { globalScope } from '../../constants/runtime'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../../constants/env'

const model = {
  buildEnv: BUILD_ENV,
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
  /** Agent-specific metadata found in the RUM call response. ex. entityGuid */
  appMetadata: {},
  session: undefined,
  version: VERSION,
  denyList: undefined,
  harvestCount: 0,
  timeKeeper: undefined,
  get harvestId () {
    return [this.session?.state.value, this.ptid, this.harvestCount].filter(x => x).join('_')
  }
}

const _cache = {}

export function getRuntime (id) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Runtime for ${id} was never set`)
  return _cache[id]
}

export function setRuntime (id, obj) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  _cache[id] = getModeledObject(obj, model)
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.runtime = _cache[id]
}
