import { FEATURE_NAMES } from '../features/features'
import { getConfigurationValue, getInfo, getRuntime } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import { handle } from '../../common/event-emitter/handle'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { single } from '../../common/util/invoke'
import * as submitData from '../../common/util/submit-data'
import { isBrowserScope } from '../../common/constants/runtime'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'
import { LocalStorage } from '../../common/storage/local-storage'
import { LOCAL_STORAGE_KEY } from '../../common/debugger'
import { log } from '../../common/util/console'
import { gosCDN } from '../../common/window/nreum'

export function setAPI (agentIdentifier) {
  var instanceEE = ee.get(agentIdentifier)
  var cycle = 0

  var scheme = (getConfigurationValue(agentIdentifier, 'ssl') === false) ? 'http' : 'https'

  var api = {
    finished: single(finished),
    setErrorHandler,
    addToTrace,
    inlineHit,
    addRelease,
    enableDebugging,
    saveDebuggingLog
  }

  // Hook all of the api functions up to the queues/stubs created in loader/api.js
  Object.entries(api).forEach(([fnName, fnCall]) => registerHandler('api-' + fnName, fnCall, 'api', instanceEE))

  // All API functions get passed the time they were called as their
  // first parameter. These functions can be called asynchronously.

  function finished (t, providedTime) {
    var time = providedTime ? providedTime - getRuntime(agentIdentifier).offset : t
    handle(CUSTOM_METRIC_CHANNEL, ['finished', { time }], undefined, FEATURE_NAMES.metrics, instanceEE)
    addToTrace(t, { name: 'finished', start: time + getRuntime(agentIdentifier).offset, origin: 'nr' })
    handle('api-addPageAction', [time, 'finished'], undefined, FEATURE_NAMES.pageAction, instanceEE)
  }

  function addToTrace (t, evt) {
    if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

    var report = {
      n: evt.name,
      s: evt.start - getRuntime(agentIdentifier).offset,
      e: (evt.end || evt.start) - getRuntime(agentIdentifier).offset,
      o: evt.origin || '',
      t: 'api'
    }

    handle('bstApi', [report], undefined, FEATURE_NAMES.sessionTrace, instanceEE)
  }

  // NREUM.inlineHit(requestName, queueTime, appTime, totalBackEndTime, domTime, frontEndTime)
  //
  // requestName - the 'web page' name or service name
  // queueTime - the amount of time spent in the app tier queue
  // appTime - the amount of time spent in the application code
  // totalBackEndTime - the total roundtrip time of the remote service call
  // domTime - the time spent processing the result of the service call (or user defined)
  // frontEndTime - the time spent rendering the result of the service call (or user defined)
  function inlineHit (t, requestName, queueTime, appTime, totalBackEndTime, domTime, frontEndTime) {
    if (!isBrowserScope) return

    requestName = window.encodeURIComponent(requestName)
    cycle += 1

    const agentInfo = getInfo(agentIdentifier)
    if (!agentInfo.beacon) return

    var url = scheme + '://' + agentInfo.beacon + '/1/' + agentInfo.licenseKey

    url += '?a=' + agentInfo.applicationID + '&'
    url += 't=' + requestName + '&'
    url += 'qt=' + ~~queueTime + '&'
    url += 'ap=' + ~~appTime + '&'
    url += 'be=' + ~~totalBackEndTime + '&'
    url += 'dc=' + ~~domTime + '&'
    url += 'fe=' + ~~frontEndTime + '&'
    url += 'c=' + cycle

    submitData.xhr({ url })
  }

  function setErrorHandler (t, handler) {
    getRuntime(agentIdentifier).onerror = handler
  }

  var releaseCount = 0
  function addRelease (t, name, id) {
    if (++releaseCount > 10) return
    getRuntime(agentIdentifier).releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }

  function enableDebugging (enabled) {
    const localStorage = new LocalStorage()
    if (enabled === true) {
      localStorage.set(LOCAL_STORAGE_KEY, 'true')
      log('Browser Agent debugging enabled. Refresh page to start debugging.')
    } else {
      localStorage.remove(LOCAL_STORAGE_KEY)
      log('Browser Agent debugging disabled. Refresh page to stop debugging.')
    }
  }

  function saveDebuggingLog () {
    const nr = gosCDN()
    if (nr.initializedAgents[agentIdentifier]?.debugger) {
      nr.initializedAgents[agentIdentifier].debugger.saveDebuggingLog()
    }
  }
}
