import { ieVersion } from '../../browser-version/ie-version'
import { getLastTimestamp } from '../../timing/now'
import { BUILD, DEBUG } from '../../constants/environment-variables'
import * as userAgent from '../../util/user-agent'
import { setValues, id as agentIdentifier } from './set-values'

var XHR = window.XMLHttpRequest
var XHR_PROTO = XHR && XHR.prototype

const runtimeConfiguration = {
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
  debug: DEBUG,
  agentIdentifier
}

export function getRuntime() {
  return runtimeConfiguration
}

export function setRuntime(obj) {
  setValues(obj, runtimeConfiguration, 'runtimeConfiguration')
}
