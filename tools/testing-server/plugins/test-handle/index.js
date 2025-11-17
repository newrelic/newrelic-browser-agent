const fp = require('fastify-plugin')
const { testIdFromRequest } = require('../../utils/fastify-request')

/**
 * Fastify plugin to decorate the fastify instance with bam test handle methods.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.decorateRequest('scheduledReply', null)
  fastify.decorateRequest('networkCaptures', null)
  fastify.decorateRequest('testHandle', null)
  fastify.addHook('onRequest', async (request) => {
    request.networkCaptures = new Set()
  })
  fastify.addHook('preHandler', async (request, reply) => {
    const testId = testIdFromRequest(request)
    const testHandle = testServer.getTestHandle(testId)
    if (testHandle) {
      request.testHandle = testHandle
      testHandle.processRequest(fastify.testServerId, fastify, request)
    }
    if (!!testId && request.url.startsWith('/tests/assets') && request.url.includes('.html')) {
      reply.header('set-cookie', `test-id=${testId};path=/build/`)
      reply.header('set-cookie', `test-id=${testId};path=/tests/assets/`)
    }

    if (request.query.nonce) {
      reply.header('content-security-policy', `script-src 'nonce-${request.query.nonce}'`)
    }
  })
  fastify.addHook('onSend', (request, reply, payload, done) => {
    if (request.scheduledReply) {
      if (request.scheduledReply.statusCode) {
        reply.code(request.scheduledReply.statusCode)
      }
      if (Object.prototype.hasOwnProperty.call(request.scheduledReply, 'body')) {
        payload = request.scheduledReply.body
      }
      if (Object.prototype.hasOwnProperty.call(request.scheduledReply, 'removeHeaders')) {
        for (const header of request.scheduledReply.removeHeaders) {
          reply.removeHeader(header)
        }
      }
      if (Object.prototype.hasOwnProperty.call(request.scheduledReply, 'setHeaders')) {
        for (const header of request.scheduledReply.setHeaders) {
          reply.header(header.key, header.value)
        }
      }
    }

    request.networkCaptures?.forEach(networkCapture => {
      networkCapture.capture(request, reply, payload)
    })

    if (request.scheduledReply && request.scheduledReply.delay) {
      setTimeout(() => done(null, payload), request.scheduledReply.delay)
    } else {
      done(null, payload)
    }
  })
})
