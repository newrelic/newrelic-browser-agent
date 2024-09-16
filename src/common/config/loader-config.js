import { getNREUMInitializedAgent } from '../window/nreum'
import { getModeledObject } from './configurable'

const model = {
  accountID: undefined,
  trustKey: undefined,
  agentID: undefined,
  licenseKey: undefined,
  applicationID: undefined,
  xpid: undefined
}

const _cache = {}

export function getLoaderConfig (id) {
  if (!id) throw new Error('All loader-config objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`LoaderConfig for ${id} was never set`)
  return _cache[id]
}

export function setLoaderConfig (id, obj) {
  if (!id) throw new Error('All loader-config objects require an agent identifier!')
  _cache[id] = getModeledObject(obj, model)
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.loader_config = _cache[id]
}
