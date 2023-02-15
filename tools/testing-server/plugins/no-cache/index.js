const fp = require('fastify-plugin')

/**
 * Fastify plugin to disable browser caching. Caching when running tests can cause
 * false positives and negatives.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addHook('onSend', (request, reply, response, done) => {
    reply.header('Surrogate-Control', 'no-store')
    reply.header(
      'Cache-Control',
      'no-cache, must-revalidate, proxy-revalidate'
    )
    reply.header('Pragma', 'no-cache')
    reply.header('Expires', '0')

    done(null, response)
  })
})
