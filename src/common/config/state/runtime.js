import { getModeledObject } from './configurable'
import { getNREUMInitializedAgent } from '../../window/nreum'
import { globalScope, originTime } from '../../constants/runtime'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../../constants/env'

const model = () => {
  const readonly = {
    buildEnv: BUILD_ENV,
    distMethod: DIST_METHOD,
    version: VERSION,
    originTime
  }

  return {
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
    xhrWrappable: typeof globalScope.XMLHttpRequest?.prototype?.addEventListener === 'function',
    denyList: undefined,
    harvestCount: 0,
    timeKeeper: undefined,
    ...readonly
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
  _cache[id] = getModeledObject(obj, model())
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.runtime = _cache[id]
}
