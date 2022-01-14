var handle = require('./handle')

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

/**
 * Records a supportabilityMetric (sm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {number} [value] - The value of the metric, if none, will increment counter
 * @returns void
 */
function recordSupportability(name, value) {
  var opts = [
    SUPPORTABILITY_METRIC,
    name,
    {name: name},
    value
  ]

  handle('storeMetric', opts, null, 'api')
  return opts
}

/**
 * Records a customMetric (cm) using the value of a named property or as a counter without a value.
 * @param {string} name - Name of the metric, this will be used to create the parent name of the metric.
 * @param {Object.<string, number>} [value] - The named property upon which to aggregate values. This will generate the substring of the metric name. If none, will incrememnt counter
 * @returns void
 */
function recordCustom(name, metrics) {
  var opts = [
    CUSTOM_METRIC,
    name,
    {name: name},
    metrics
  ]

  handle('storeEventMetrics', opts, null, 'api')
  return opts
}

module.exports = {
  constants: {SUPPORTABILITY_METRIC: SUPPORTABILITY_METRIC, CUSTOM_METRIC: CUSTOM_METRIC},
  recordSupportability: recordSupportability,
  recordCustom: recordCustom
}
