import { ieVersion } from '../../browser-version/ie-version'
import { getLastTimestamp } from '../../timing/now'
import * as userAgent from '../../util/user-agent'
import { Configurable } from './configurable'
import { gosNREUMInitializedAgents } from '../../window/nreum'
import { getCurrentSessionIdOrMakeNew } from '../../window/session-storage'
import { getConfigurationValue } from '../config'
import { globalScope } from '../../util/global-scope';
import { VERSION } from '../../constants/environment-variables'

var XHR = globalScope?.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype

const model = agentId => { return {
  customTransaction: undefined,
  disabled: false,
  features: {},
  isolatedBacklog: false,
  loaderType: undefined,
  maxBytes: ieVersion === 6 ? 2000 : 30000,
  offset: getLastTimestamp(),
  onerror: undefined,
  origin: '' + globalScope?.location,
  ptid: undefined,
  releaseIds: {},
  sessionId: getConfigurationValue(agentId, 'privacy.cookies_enabled') == true ?
    getCurrentSessionIdOrMakeNew() : null,  // if cookies (now session tracking) is turned off or can't get session ID, this is null
<<<<<<< HEAD
  xhrWrappable: XHR && XHR_PROTO && XHR_PROTO['addEventListener'],
  userAgent
=======
  xhrWrappable: XHR && XHR_PROTO && XHR_PROTO['addEventListener'] && !/CriOS/.test(navigator.userAgent),
  userAgent,
  version: VERSION
>>>>>>> 33d6e21 (add build version to runtime obj)
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
