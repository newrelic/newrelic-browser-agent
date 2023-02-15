const { URL } = require('url')
const fp = require('fastify-plugin')

/**
 * Fastify plugin to decorate the fastify instance with bam test handle methods.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.decorateRequest('scheduledReply', null)
  fastify.decorateRequest('resolvingExpect', null)
  fastify.addHook('preHandler', async (request) => {
    let testHandle
    const url = new URL(request.url, 'resolve://')
    const urlTestId = url.pathname.match(/.*\/(.*$)/)

    if (Array.isArray(urlTestId) && urlTestId.length > 1) {
      testHandle = testServer.getTestHandle(urlTestId[1])
    }

    if (!testHandle && request.query.testId) {
      testHandle = testServer.getTestHandle(request.query.testId)
    }

    if (testHandle) {
      testHandle.processRequest(fastify.testServerId, fastify, request)
    }
  })
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.scheduledReply) {
      if (request.scheduledReply.statusCode) {
        reply.code(request.scheduledReply.statusCode)
      }
      if (request.scheduledReply.body) {
        payload = request.scheduledReply.body
      }
      if (request.scheduledReply.delay) {
        await new Promise(resolve => {
          setTimeout(resolve, request.scheduledReply.delay)
        })
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

    return Promise.resolve(payload)
  })
})
