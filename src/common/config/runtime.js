import { getModeledObject } from './configurable'
import { getNREUMInitializedAgent } from '../window/nreum'
import { globalScope, originTime } from '../constants/runtime'
import { BUILD_ENV, DIST_METHOD, VERSION } from '../constants/env'
import { EventManager } from '../../features/utils/event-manager'

/**
 * Module level count of harvests. This property will auto-increment each time it is accessed.
 * @type {number}
 */
let harvestCount = 0

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
  timeKeeper: undefined,
  obfuscator: undefined,
  eventManager: new EventManager()
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

  if (!Object.hasOwnProperty.call(_cache[id], 'harvestCount')) {
    // Harvest count needs to be added as a getter so the variable is updated each time it is accessed
    Object.defineProperty(_cache[id], 'harvestCount', {
      get: () => ++harvestCount
    })
  }

  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.runtime = _cache[id]
}
