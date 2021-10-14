var handle = require('handle')
var loader = require('loader')

var SUPPORTABILITY_METRIC = 'sm'
var CUSTOM_METRIC = 'cm'

/**
 * Increments the count of a named metric by 1
 * @param {string} name - Name of the metric
 * @param {boolean} [isSupportability] - determines which bucket ('cm' or 'sm') to store the metric
 * @returns void
 */
function incrementCounter (name, isSupportability) {
  handle('api-storeCustomMetric', [
    loader.now(),
    isSupportability ? SUPPORTABILITY_METRIC : CUSTOM_METRIC,
    name,
    {name: name}
  ], null, 'api')
}

/**
 * Increments the value of a named property, which defaults to "stats" if no object is supplied
 * @param {string} name - Name of the metric
 * @param {object | number} value - The named property to increment, defaults to {stats: number} if no object is supplied
 * @param {boolean} [isSupportability] - determines which bucket ('cm' or 'sm') to store the metric
 * @returns void
 */
function incrementValue (name, value, isSupportability) {
  var opts = [
    loader.now(),
    isSupportability ? SUPPORTABILITY_METRIC : CUSTOM_METRIC,
    name,
    {name: name}
  ]
  if (typeof value === 'number') opts.push({stats: value})
  else if (typeof value === 'object') opts.push(value)
  handle('api-storeCustomMetric', opts, null, 'api')
}

module.exports = {
  incrementCounter: incrementCounter,
  incrementValue: incrementValue
}
