const { URL } = require('url')

/**
 * Extracts a test id from a fastify request.
 * @param {module:fastify.FastifyRequest} request
 */
module.exports.testIdFromRequest = function testIdFromRequest (request) {
  const url = new URL(request.url, 'resolve://')
  const urlTestId = url.pathname.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)

  if (Array.isArray(urlTestId) && urlTestId.length > 1) {
    return urlTestId[1]
  }

  if (request.query.browser_monitoring_key) {
    return request.query.browser_monitoring_key
  }

  if (request.query.testId) {
    return request.query.testId
  }

  if (request.headers.cookie && request.headers.cookie.includes('test-id=')) {
    const testId = request.headers.cookie.match(new RegExp('(^| )test-id=([^;]+)'))[2]
    if (testId && testId !== 'undefined') return testId
  }
}
