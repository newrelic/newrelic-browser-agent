const fp = require('fastify-plugin')
const { deserialize } = require('../../../shared/serializer.js')

/**
 * Fastify plugin to deserialize the body of requests with specific content-type.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addContentTypeParser('application/serialized+json', { parseAs: 'string' },
    function (req, body, done) {
      try {
        done(null, deserialize(body))
      } catch (error) {
        done(error, body)
      }
    })
})
