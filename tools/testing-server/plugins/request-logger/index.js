const fp = require('fastify-plugin')

/**
 * Fastify plugin to log requests when the cli option `-L` is set.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.url.startsWith('/debug')) {
      fastify.testServerLogger.logNetworkRequest(request)
    }
    done()
  })
})
