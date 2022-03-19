import * as aggregator from '../../../common/aggregate/aggregator'
import { measure } from '../../../common/timing/stopwatch'
import { mapOwn } from '../../../common/util/map-own'
import { baseQueryString } from '../../../common/harvest/harvest'
import { param, fromArray } from '../../../common/url/encode'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { addMetric as addPaintMetric } from '../../../common/metrics/paint-metrics'
import { submitData } from '../../../common/util/submit-data'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { log } from '../../../common/debug/logging'

const getScheme = () => getConfigurationValue('ssl') === false ? 'http' : 'https'

const jsonp = 'NREUM.setToken'


// nr is injected into all send methods. This allows for easier testing
// we could require('loader') instead
export function initialize () {
  log('initialize (send rum)!')
  log("getInfo method...", getInfo)
  const info = getInfo()
  log('sendRum info', info)
  if (!info.beacon) return
  if (info.queueTime) aggregator.store('measures', 'qt', { value: info.queueTime })
  if (info.applicationTime) aggregator.store('measures', 'ap', { value: info.applicationTime })

  log('sendRum continue')
  // some time in the past some code will have called stopwatch.mark('starttime', Date.now())
  // calling measure like this will create a metric that measures the time differential between
  // the two marks.
  measure('be', 'starttime', 'firstbyte')
  measure('fe', 'firstbyte', 'onload')
  measure('dc', 'firstbyte', 'domContent')

  var measuresMetrics = aggregator.get('measures')

  log('measureMetrics', measuresMetrics)

  var measuresQueryString = mapOwn(measuresMetrics, function (metricName, measure) {
    return '&' + metricName + '=' + measure.params.value
  }).join('')

  log('measuresQueryString', measuresQueryString)

  // if (measuresQueryString) {
  // currently we only have one version of our protocol
  // in the future we may add more
  var protocol = '1'

  var chunksForQueryString = [baseQueryString(getRuntime())]

  chunksForQueryString.push(measuresQueryString)

  chunksForQueryString.push(param('tt', info.ttGuid))
  chunksForQueryString.push(param('us', info.user))
  chunksForQueryString.push(param('ac', info.account))
  chunksForQueryString.push(param('pr', info.product))
  chunksForQueryString.push(param('af', mapOwn(getRuntime().features, function (k) { return k }).join(',')))

  if (window.performance && typeof (window.performance.timing) !== 'undefined') {
    var navTimingApiData = ({
      timing: addPT(window.performance.timing, {}),
      navigation: addPN(window.performance.navigation, {})
    })
    chunksForQueryString.push(param('perf', stringify(navTimingApiData)))
  }

  if (window.performance && window.performance.getEntriesByType) {
    var entries = window.performance.getEntriesByType('paint')
    if (entries && entries.length > 0) {
      entries.forEach(function(entry) {
        if (!entry.startTime || entry.startTime <= 0) return

        if (entry.name === 'first-paint') {
          chunksForQueryString.push(param('fp',
            String(Math.floor(entry.startTime))))
        } else if (entry.name === 'first-contentful-paint') {
          chunksForQueryString.push(param('fcp',
            String(Math.floor(entry.startTime))))
        }
        addPaintMetric(entry.name, Math.floor(entry.startTime))
      })
    }
  }

  chunksForQueryString.push(param('xx', info.extra))
  chunksForQueryString.push(param('ua', info.userAttributes))
  chunksForQueryString.push(param('at', info.atts))

  var customJsAttributes = stringify(info.jsAttributes)
  chunksForQueryString.push(param('ja', customJsAttributes === '{}' ? null : customJsAttributes))

  var queryString = fromArray(chunksForQueryString, getRuntime().maxBytes)

  log('submitData! -- scheme...', getScheme())
  submitData.jsonp(
    getScheme() + '://' + info.beacon + '/' + protocol + '/' + info.licenseKey + queryString,
    jsonp
  )
  // }
}
