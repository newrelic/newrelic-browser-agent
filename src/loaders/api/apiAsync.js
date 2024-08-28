import { FEATURE_NAMES } from '../features/features'
import { getRuntime } from '../../common/config/runtime'
import { ee } from '../../common/event-emitter/contextual-ee'
import { handle } from '../../common/event-emitter/handle'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { single } from '../../common/util/invoke'
import { CUSTOM_METRIC_CHANNEL } from '../../features/metrics/constants'
import { originTime } from '../../common/constants/runtime'

export function setAPI (agentIdentifier) {
  var instanceEE = ee.get(agentIdentifier)

  var api = {
    finished: single(finished),
    setErrorHandler,
    addToTrace,
    addRelease
  }

  // Hook all of the api functions up to the queues/stubs created in loader/api.js
  Object.entries(api).forEach(([fnName, fnCall]) => registerHandler('api-' + fnName, fnCall, 'api', instanceEE))

  // All API functions get passed the time they were called as their
  // first parameter. These functions can be called asynchronously.

  function finished (t, providedTime) {
    var time = providedTime ? providedTime - originTime : t
    handle(CUSTOM_METRIC_CHANNEL, ['finished', { time }], undefined, FEATURE_NAMES.metrics, instanceEE)
    addToTrace(t, { name: 'finished', start: time + originTime, origin: 'nr' })
    handle('api-addPageAction', [time, 'finished'], undefined, FEATURE_NAMES.genericEvents, instanceEE)
  }

  function addToTrace (t, evt) {
    if (!(evt && typeof evt === 'object' && evt.name && evt.start)) return

    var report = {
      n: evt.name,
      s: evt.start - originTime,
      e: (evt.end || evt.start) - originTime,
      o: evt.origin || '',
      t: 'api'
    }

    handle('bstApi', [report], undefined, FEATURE_NAMES.sessionTrace, instanceEE)
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
