var handle = require('handle')
var loader = require('loader')

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

function storeCustomMetric (name, value, isSupportability) {
  var opts = [
    loader.now(),
    isSupportability ? SUPPORTABILITY_METRIC : CUSTOM_METRIC,
    name,
    {name: name}
  ]
  if (value && typeof value === 'object') opts.push(value)

  handle('api-storeMetric', opts, null, 'api')
  return opts
}

/**
 * Records a supportabilityMetric (sm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name.
 * @returns void
 */
function recordSupportability(name, value) {
  return storeCustomMetric(name, value, true)
}

/**
 * Records a customMetric (cm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name.
 * @returns void
 */
function recordCustom(name, value) {
  return storeCustomMetric(name, value, false)
}

module.exports = {
  constants: {SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC, CUSTOM_METRIC: CUSTOM_METRIC},
  recordSupportability: recordSupportability,
  recordCustom: recordCustom
}
