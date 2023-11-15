const fp = require('fastify-plugin')

/**
 * Fastify plugin to log requests when the cli option `-L` is set.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addHook('onSend', (request, reply, response, done) => {
    if (!request.url.startsWith('/debug') && !request.url.startsWith('/health')) {
      fastify.testServerLogger.logNetworkRequest(request, reply)
    }

    done(null, response)
  })
})
