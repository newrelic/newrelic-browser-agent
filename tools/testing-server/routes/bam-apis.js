const fp = require('fastify-plugin')
const { rumFlags } = require('../constants')
const sessionReplayData = require('../utils/session-replay-data')

/**
 * Fastify plugin to apply routes to the bam server.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify) {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/debug',
    handler: async function (request, reply) {
      fastify.testServerLogger.logDebugShimMessage(request)
      reply.code(200).send()
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'rum')
      }

      if (!request.query.jsonp) {
        return reply
          .header('content-type', 'application/json')
          .code(200)
          .send(JSON.stringify(rumFlags))
      } else {
        return reply
          .header('content-type', 'application/javascript')
          .code(200)
          .send(`${request.query.jsonp}(${JSON.stringify(rumFlags)})`)
      }
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/events/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'events')
      }
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/blob',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'blob')
      }

      console.log(request.body)
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/jserrors/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'jserrors')
      }

      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/ins/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'ins')
      }

      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/resources/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'resources')
      }

      // This endpoint must reply with some text in the body or further resource harvests will be disabled
      return reply.code(200).send('123-456')
    }
  })

  fastify.route({
    method: ['GET', 'POST'],
    url: '/session/1/:testId',
    handler: async function (request, reply) {
      if (request.testHandle) {
        request.testHandle.incrementRequestCount(fastify.testServerId, 'session')
      }

      console.log(request.query.s)
      sessionReplayData[request.query.s] ??= []
      sessionReplayData[request.query.s].push(...JSON.parse(request.body).data)

      return reply.code(200).send('')
    }
  })
})
