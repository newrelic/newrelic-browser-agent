const fp = require('fastify-plugin')
const { v4: uuidv4 } = require('uuid')
const { rumFlags } = require('../constants')
const { storeReplayData } = require('../utils/replay-buffer')

/**
 * Fastify plugin to apply routes to the bam server.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify) {
  const makeConnectResponse = () => {
    const flags = rumFlags()
    return {
      config: {
        err: flags.err,
        ins: flags.ins,
        spa: flags.spa,
        sr: flags.sr,
        srs: flags.srs,
        st: flags.st,
        sts: flags.sts,
        log: flags.log,
        logapi: flags.logapi
      },
      app: flags.app
    }
  }

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
      return reply
        .header('content-type', 'application/json')
        .header('Timing-Allow-Origin', request.headers.origin)
        .code(200)
        .send(JSON.stringify(rumFlags()))
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/browser/connect/2/:testId',
    handler: async function (request, reply) {
      return reply
        .header('content-type', 'application/json')
        .header('Timing-Allow-Origin', request.headers.origin)
        .code(200)
        .send(JSON.stringify(makeConnectResponse()))
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/rum/2/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/events/1/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/events/2/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['POST'],
    url: '/browser/blobs',
    handler: async function (request, reply) {
      if (!request.testHandle) {
        // running without a test handle... lets buffer it so we can replay it later
        const attributes = new URLSearchParams(request.query?.attributes)
        storeReplayData(attributes.get('session'), attributes.get('replay.firstTimestamp'), request.body)
      }

      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['POST'],
    url: '/browser/logs',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/jserrors/1/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/jserrors/2/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/ins/1/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/ins/2/:testId',
    handler: async function (request, reply) {
      return reply.code(200).send('')
    }
  })
  fastify.route({
    method: ['GET', 'POST'],
    url: '/resources/1/:testId',
    handler: async function (request, reply) {
      // This endpoint must reply with some text in the body or further resource harvests will be disabled
      return reply.code(200).send(uuidv4())
    }
  })
})
