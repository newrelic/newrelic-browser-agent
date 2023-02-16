const fp = require('fastify-plugin')
const { testIdFromRequest } = require('../../utils/fastify-request')

/**
 * Fastify plugin to decorate the fastify instance with bam test handle methods.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.decorateRequest('scheduledReply', null)
  fastify.decorateRequest('resolvingExpect', null)
  fastify.decorateRequest('testHandle', null)
  fastify.addHook('preHandler', async (request) => {
    const testId = testIdFromRequest(request)
    const testHandle = testServer.getTestHandle(testId)

    if (testHandle) {
      request.testHandle = testHandle
      testHandle.processRequest(fastify.testServerId, fastify, request)
    }
  })
  fastify.addHook('onSend', (request, reply, payload, done) => {
    if (request.scheduledReply) {
      if (request.scheduledReply.statusCode) {
        reply.code(request.scheduledReply.statusCode)
      }
      if (request.scheduledReply.body) {
        payload = request.scheduledReply.body
      }
    }

    if (request.resolvingExpect) {
      request.resolvingExpect.resolve({
        request: {
          body: request.body,
          query: request.query,
          headers: request.headers,
          method: request.method.toUpperCase()
        },
        reply: {
          statusCode: reply.statusCode,
          body: payload
        }
      })
    }

    if (request.scheduledReply && request.scheduledReply.delay) {
      setTimeout(() => done(null, payload), request.scheduledReply.delay)
    } else {
      done(null, payload)
    }
  })
})
