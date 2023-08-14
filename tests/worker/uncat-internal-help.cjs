const { getMetricsFromResponse } = require('../functional/err/assertion-helpers') // used by metrics tests
const url = require('url') // used by harvest tests
const cleanURL = require('../lib/clean-url.js') // used by harvest test

function fail (t, addlMsg = undefined) {
  return (err) => {
    t.error(err, addlMsg)
    t.end()
  }
}

function failWithEndTimeout (t) {
  return (err) => {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
}

function getTime (cm) {
  try {
    return cm[0].metrics.time.t
  } catch (e) {
    console.error(e)
    return 0
  }
}

const asyncApiFns = [
  'noticeError',
  'setPageViewName',
  'setCustomAttribute',
  'setUserId',
  'setErrorHandler',
  'finished',
  'addToTrace',
  'addRelease'
].map((fn) => `API/${fn}/called`)

function extractWorkerSM (supportabilityMetrics) {
  const wsm = {}
  const flags = ['classicWorker', 'moduleWorker', 'classicShared', 'moduleShared', 'classicService', 'moduleService',
    'sharedUnavail', 'serviceUnavail', 'workerImplFail', 'sharedImplFail', 'serviceImplFail']
  flags.forEach(key => wsm[key] = false)

  // Comb through for specific worker SM tags we want to see.
  for (const sm of supportabilityMetrics) {
    switch (sm.params.name) {
      case 'Workers/Dedicated/Classic':
        wsm.classicWorker = true; break
      case 'Workers/Dedicated/Module':
        wsm.moduleWorker = true; break
      case 'Workers/Dedicated/SM/Unsupported':
        wsm.workerImplFail = true; break
      case 'Workers/Shared/Classic':
        wsm.classicShared = true; break
      case 'Workers/Shared/Module':
        wsm.moduleShared = true; break
      case 'Workers/Shared/SM/Unsupported':
        wsm.sharedImplFail = true; break
      case 'Workers/Shared/Unavailable':
        wsm.sharedUnavail = true; break
      case 'Workers/Service/Classic':
        wsm.classicService = true; break
      case 'Workers/Service/Module':
        wsm.moduleService = true; break
      case 'Workers/Service/SM/Unsupported':
        wsm.serviceImplFail = true; break
      case 'Workers/Service/Unavailable':
        wsm.serviceUnavail = true; break
    }
  }
  return wsm
}

module.exports = { fail, failWithEndTimeout, getTime, asyncApiFns, extractWorkerSM, getMetricsFromResponse, url, cleanURL }
