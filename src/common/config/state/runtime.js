import { getModeledObject } from './configurable'
import { getNREUMInitializedAgent } from '../../window/nreum'
import { globalScope, originTime } from '../../constants/runtime'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../../constants/env'

const readonly = {
  buildEnv: BUILD_ENV,
  distMethod: DIST_METHOD,
  version: VERSION,
  originTime
}

const model = {
  customTransaction: undefined,
  disabled: false,
  isolatedBacklog: false,
  loaderType: undefined,
  maxBytes: 30000,
  onerror: undefined,
  origin: '' + globalScope.location,
  ptid: undefined,
  releaseIds: {},
  /** Agent-specific metadata found in the RUM call response. ex. entityGuid */
  appMetadata: {},
  session: undefined,
  denyList: undefined,
  harvestCount: 0,
  timeKeeper: undefined,
  obfuscator: undefined
}

const _cache = {}

export function getRuntime (id) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Runtime for ${id} was never set`)
  return _cache[id]
}

export function setRuntime (id, obj) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  _cache[id] = {
    ...getModeledObject(obj, model),
    ...readonly
  }
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.runtime = _cache[id]
}
