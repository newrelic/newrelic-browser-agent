const fp = require('fastify-plugin')
const { v4: uuidV4 } = require('uuid')

/**
 * Fastify plugin to apply routes to the command server.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.get('/health', async function (request, reply) {
    reply.code(204).send()
  })
  fastify.get('/test-handle', async function (request, reply) {
    const testId = uuidV4()
    testServer.createTestHandle(testId)
    reply.code(200).send({
      testId
    })
  })
  fastify.delete('/test-handle/:testId', async function (request, reply) {
    testServer.destroyTestHandle(request.params.testId)
    reply.code(204).send()
  })
  // fastify.post('/expect');
  // fastify.post('/scheduleReply');
})
