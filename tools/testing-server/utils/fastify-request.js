const { URL } = require('url')

/**
 * Extracts a test id from a fastify request.
 * @param {module:fastify.FastifyRequest} request
 */
module.exports.testIdFromRequest = function testIdFromRequest (request) {
  const url = new URL(request.url, 'resolve://')
  const urlTestId = url.pathname.match(/.*\/(.*$)/)

  if (Array.isArray(urlTestId) && urlTestId.length > 1) {
    return urlTestId[1]
  }

  if (request.query.testId) {
    return request.query.testId
  }
}
