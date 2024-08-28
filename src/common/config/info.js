import { defaults as nrDefaults, getNREUMInitializedAgent } from '../window/nreum'
import { getModeledObject } from './configurable'

const model = {
  // preset defaults
  beacon: nrDefaults.beacon,
  errorBeacon: nrDefaults.errorBeacon,
  // others must be populated by user
  licenseKey: undefined,
  applicationID: undefined,
  sa: undefined,
  queueTime: undefined,
  applicationTime: undefined,
  ttGuid: undefined,
  user: undefined,
  account: undefined,
  product: undefined,
  extra: undefined,
  jsAttributes: {

  },
  userAttributes: undefined,
  atts: undefined,
  transactionName: undefined,
  tNamePlain: undefined
}

const _cache = {}

export function isValid (id) {
  try {
    const info = getInfo(id)
    return (!!info.licenseKey && !!info.errorBeacon && !!info.applicationID)
  } catch (err) {
    return false
  }
}

export function getInfo (id) {
  if (!id) throw new Error('All info objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Info for ${id} was never set`)
  return _cache[id]
}

export function setInfo (id, obj) {
  if (!id) throw new Error('All info objects require an agent identifier!')
  _cache[id] = getModeledObject(obj, model)
  const agentInst = getNREUMInitializedAgent(id)
  if (agentInst) agentInst.info = _cache[id]
}
