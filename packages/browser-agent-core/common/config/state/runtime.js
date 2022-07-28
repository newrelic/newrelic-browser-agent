import { ieVersion } from '../../browser-version/ie-version'
import { getLastTimestamp } from '../../timing/now'
import * as userAgent from '../../util/user-agent'
import { Configurable } from './configurable'
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { getCurrentSessionIdOrMakeNew } from '../../window/session-storage'
import { getConfigurationValue } from '../config'

var XHR = window.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype

const model = agentId => { return {
  customTransaction: undefined,
  disabled: false,
  features: {},
  maxBytes: ieVersion === 6 ? 2000 : 30000,
  offset: getLastTimestamp(),
  onerror: undefined,
  origin: '' + window.location,
  ptid: undefined,
  releaseIds: {},
  sessionId: getConfigurationValue(agentId, 'privacy.cookies_enabled') === true ? getCurrentSessionIdOrMakeNew() : '0',
  xhrWrappable: XHR && XHR_PROTO && XHR_PROTO['addEventListener'] && !/CriOS/.test(navigator.userAgent),
  userAgent
}}

const _cache = {}

export function getRuntime(id) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  if (!_cache[id]) throw new Error(`Runtime for ${id} was never set`)
  return _cache[id]
}

export function setRuntime(id, obj) {
  if (!id) throw new Error('All runtime objects require an agent identifier!')
  _cache[id] = new Configurable(obj, model(id))
  gosNREUMInitializedAgents(id, _cache[id], 'runtime')
}
