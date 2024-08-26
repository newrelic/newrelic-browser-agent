const fp = require('fastify-plugin')
const { v4: uuidV4 } = require('uuid')

/**
 * Fastify plugin to apply routes to the command server.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
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
  fastify.post('/test-handle/:testId/asset-url', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      const result = await testHandle.assetURL(request.body.assetFile, request.body.query)
      reply.code(200).send({
        assetURL: result
      })
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.post('/test-handle/:testId/expect', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      const result = await testHandle.expect(request.body.serverId, request.body.expectOpts)
      reply.code(200).send(result)
    } catch (e) {
      reply.code(400).send(e)
    }
  })

  // Scheduled Replays APIs

  fastify.post('/test-handle/:testId/scheduleReply', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      testHandle.scheduleReply(request.body.serverId, request.body.scheduledReply)
      reply.code(200).send()
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.delete('/test-handle/:testId/scheduleReply', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      testHandle.clearScheduledReply(request.body.serverId, request.body.scheduledReply)
      reply.code(200).send()
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.post('/test-handle/:testId/clearScheduledReplies', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      testHandle.clearScheduledReplies(request.body.serverId)
      reply.code(200).send()
    } catch (e) {
      reply.code(400).send(e)
    }
  })

  // Network Captures APIs

  fastify.post('/test-handle/:testId/network-capture/:serverId', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      const networkCaptures = testHandle.createNetworkCaptures(request.params.serverId, request.body)
      reply.code(200).send(networkCaptures)
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.get('/test-handle/:testId/network-capture/:serverId/:captureId', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      const networkCaptureCache = testHandle.getNetworkCaptureCache(request.params.serverId, request.params.captureId)
      reply.code(200).send(networkCaptureCache)
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.delete('/test-handle/:testId/network-capture/:serverId/:captureId', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      testHandle.destroyNetworkCapture(request.params.serverId, request.params.captureId)
      reply.code(204).send()
    } catch (e) {
      reply.code(400).send(e)
    }
  })
  fastify.post('/test-handle/:testId/network-capture/:serverId/:captureId/await', async function (request, reply) {
    const testHandle = testServer.getTestHandle(request.params.testId)

    try {
      const networkCaptureCache = await testHandle.awaitNetworkCapture(request.params.serverId, request.params.captureId, request.body)
      reply.code(200).send(networkCaptureCache)
    } catch (e) {
      reply.code(400).send(e)
    }
  })
})
