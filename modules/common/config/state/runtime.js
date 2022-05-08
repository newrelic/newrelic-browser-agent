import { ieVersion } from '../../browser-version/ie-version'
import { getLastTimestamp } from '../../timing/now'
import { BUILD, DEBUG } from '../../constants/environment-variables'
import * as userAgent from '../../util/user-agent'
import { Configurable } from './configurable'
import { gosNREUMInitializedAgents } from '../../window/nreum'

var XHR = window.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype

const model = {
  build: BUILD,
  origin: '' + window.location,
  maxBytes: ieVersion === 6 ? 2000 : 30000,
  offset: getLastTimestamp(),
  features: {},
  customTransaction: undefined,
  onerror: undefined,
  releaseIds: undefined,
  xhrWrappable: XHR && XHR_PROTO && XHR_PROTO['addEventListener'] && !/CriOS/.test(navigator.userAgent),
  disabled: undefined,
  ptid: undefined,
  userAgent,
  debug: DEBUG
}

const _cache = {}

export function getRuntime(id) {
  if (!id) throw new Error('All config objects require an agent identifier!')
  return _cache[id]
}

export function setRuntime(id, obj) {
  if (!id) throw new Error('All config objects require an agent identifier!')
  _cache[id] = new Configurable(obj, model)
  gosNREUMInitializedAgents(id, _cache[id], 'runtime')
}
