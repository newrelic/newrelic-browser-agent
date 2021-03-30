var lastTimestamp = new Date().getTime()
var offset = lastTimestamp

var performanceCheck = require('performance-check')

module.exports = now
module.exports.offset = offset
module.exports.getLastTimestamp = getLastTimestamp

function now () {
  if (performanceCheck.exists && performance.now) {
    return Math.round(performance.now())
  }
  // ensure a new timestamp is never smaller than a previous timestamp
  return (lastTimestamp = Math.max(new Date().getTime(), lastTimestamp)) - offset
}

function getLastTimestamp() {
  return lastTimestamp
}
