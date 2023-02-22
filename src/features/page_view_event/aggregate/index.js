import { measure } from '../../../common/timing/stopwatch'
import { mapOwn } from '../../../common/util/map-own'
import { param, fromArray } from '../../../common/url/encode'
import { addPT, addPN } from '../../../common/timing/nav-timing'
import { stringify } from '../../../common/util/stringify'
import { addMetric as addPaintMetric } from '../../../common/metrics/paint-metrics'
import { submitData } from '../../../common/util/submit-data'
import { getConfigurationValue, getInfo, getRuntime } from '../../../common/config/config'
import { AggregateBase } from '../../utils/aggregate-base'
import { FEATURE_NAME } from '../constants'
import { getActivatedFeaturesFlags } from './initialized-features'
import { Harvest } from '../../../common/harvest/harvest'

const jsonp = 'NREUM.setToken'

export class Aggregate extends AggregateBase {
  static featureName = FEATURE_NAME
  constructor (agentIdentifier, aggregator) {
    super(agentIdentifier, aggregator, FEATURE_NAME)
    this.auto = getConfigurationValue(this.agentIdentifier, 'page_view_event.auto') !== false
    this.prepareRum()

    if (!this.auto) this.ee.on('send-rum', this.sendRum.bind(this))
  }

  getScheme () {
    return getConfigurationValue(this.agentIdentifier, 'ssl') === false ? 'http' : 'https'
  }

  prepareRum () {
    const info = getInfo(this.agentIdentifier)
    if (!info.beacon) return
    if (info.queueTime) this.aggregator.store('measures', 'qt', { value: info.queueTime })
    if (info.applicationTime) this.aggregator.store('measures', 'ap', { value: info.applicationTime })

    // some time in the past some code will have called stopwatch.mark('starttime', Date.now())
    // calling measure like this will create a metric that measures the time differential between
    // the two marks.
    measure(this.aggregator, 'be', 'starttime', 'firstbyte')
    measure(this.aggregator, 'fe', 'firstbyte', 'onload')
    measure(this.aggregator, 'dc', 'firstbyte', 'domContent')

    const agentRuntime = getRuntime(this.agentIdentifier)
    var measuresMetrics = this.aggregator.get('measures')

    var measuresQueryString = mapOwn(measuresMetrics, function (metricName, measure) {
      return '&' + metricName + '=' + measure.params.value
    }).join('')

    // if (measuresQueryString) {
    // currently we only have one version of our protocol
    // in the future we may add more
    this.protocol = '1'

    var chunksForQueryString = [new Harvest(this).baseQueryString()]

    chunksForQueryString.push(measuresQueryString)

    chunksForQueryString.push(param('tt', info.ttGuid))
    chunksForQueryString.push(param('us', info.user))
    chunksForQueryString.push(param('ac', info.account))
    chunksForQueryString.push(param('pr', info.product))
    chunksForQueryString.push(param('af', getActivatedFeaturesFlags(this.agentIdentifier).join(',')))

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
        entries.forEach(function (entry) {
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

    this.queryString = fromArray(chunksForQueryString, agentRuntime.maxBytes)

    console.log('queryString', this.queryString)
    if (this.auto) this.sendRum()
  }

  sendRum () {
    console.log('sendRum called!')
    const runtime = getRuntime(this.agentIdentifier)
    if (runtime.sentRum++) return
    const info = getInfo(this.agentIdentifier)
    if (!info.beacon || !info.licenseKey || !this.queryString) return
    submitData.jsonp(
      this.getScheme() + '://' + info.beacon + '/' + this.protocol + '/' + info.licenseKey + this.queryString,
      jsonp
    )
  }
}
