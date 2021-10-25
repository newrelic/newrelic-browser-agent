var handle = require('handle')
var loader = require('loader')

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

function storeMetric (name, value, isSupportability) {
  var tag = isSupportability ? 'api-storeSupportability' : 'api-storeMetric'
  var opts = [
    loader.now(),
    isSupportability ? SUPPORTABILITY_METRIC : CUSTOM_METRIC,
    name,
    {name: name},
    value
  ]

  handle(tag, opts, null, 'api')
  return opts
}

/**
 * Records a supportabilityMetric (sm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {number} [value] - The value of the metric, if none, will increment counter
 * @returns void
 */
function recordSupportability(name, value) {
  return storeMetric(name, value, true)
}

/**
 * Records a customMetric (cm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name. If none, will incrememnt counter
 * @returns void
 */
function recordCustom(name, value) {
  return storeMetric(name, value, false)
}

module.exports = {
  constants: {SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC, CUSTOM_METRIC: CUSTOM_METRIC},
  recordSupportability: recordSupportability,
  recordCustom: recordCustom
}
