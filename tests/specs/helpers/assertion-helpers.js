function getMetricsFromResponse (response, isSupportability) {
  const request = response?.request
  var attr = isSupportability ? 'sm' : 'cm'
  if (request.body) {
    try {
      var parsedBody = request.body
      if (parsedBody[attr]) {
        return parsedBody[attr]
      }
    } catch (e) {}
  }
  if (request.query && request.query[attr]) {
    try {
      return JSON.parse(request.query[attr])
    } catch (e) {}
  }
  return null
}

module.exports = { getMetricsFromResponse }
