var paintMetrics = {}

module.exports = {
  addMetric: addMetric,
  metrics: paintMetrics
}

function addMetric (name, value) {
  paintMetrics[name] = value
}
