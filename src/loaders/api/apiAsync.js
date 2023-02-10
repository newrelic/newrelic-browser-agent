import { FEATURE_NAMES } from '../features/features'
import { getConfigurationValue, getInfo, getRuntime } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import { handle } from '../../common/event-emitter/handle'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { mapOwn } from '../../common/util/map-own'
import { single } from '../../common/util/single'
import { submitData } from '../../common/util/submit-data'
import { isBrowserScope } from '../../common/util/global-scope'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'

export function setAPI (agentIdentifier) {
  var instanceEE = ee.get(agentIdentifier)
  var cycle = 0

  var scheme = (getConfigurationValue(agentIdentifier, 'ssl') === false) ? 'http' : 'https'

  var api = {
    finished: single(finished),
    setErrorHandler: setErrorHandler,
    addToTrace: addToTrace,
    inlineHit: inlineHit,
    addRelease: addRelease
  }

  // Hook all of the api functions up to the queues/stubs created in loader/api.js
  mapOwn(api, function (fnName, fn) {
    registerHandler('api-' + fnName, fn, 'api', instanceEE)
  })

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

  // NREUM.inlineHit(request_name, queue_time, app_time, total_be_time, dom_time, fe_time)
  //
  // request_name - the 'web page' name or service name
  // queue_time - the amount of time spent in the app tier queue
  // app_time - the amount of time spent in the application code
  // total_be_time - the total roundtrip time of the remote service call
  // dom_time - the time spent processing the result of the service call (or user defined)
  // fe_time - the time spent rendering the result of the service call (or user defined)
  function inlineHit (t, request_name, queue_time, app_time, total_be_time, dom_time, fe_time) {
    if (!isBrowserScope) return

    request_name = window.encodeURIComponent(request_name)
    cycle += 1

    const agentInfo = getInfo(agentIdentifier)
    if (!agentInfo.beacon) return

    var url = scheme + '://' + agentInfo.beacon + '/1/' + agentInfo.licenseKey

    url += '?a=' + agentInfo.applicationID + '&'
    url += 't=' + request_name + '&'
    url += 'qt=' + ~~queue_time + '&'
    url += 'ap=' + ~~app_time + '&'
    url += 'be=' + ~~total_be_time + '&'
    url += 'dc=' + ~~dom_time + '&'
    url += 'fe=' + ~~fe_time + '&'
    url += 'c=' + cycle

    submitData.img(url)
  }

  function setErrorHandler (t, handler) {
    getRuntime(agentIdentifier).onerror = handler
  }

  var releaseCount = 0
  function addRelease (t, name, id) {
    if (++releaseCount > 10) return
    getRuntime(agentIdentifier).releaseIds[name.slice(-200)] = ('' + id).slice(-200)
  }
}
