const { URL } = require('url')
const fp = require("fastify-plugin");
const TestHandle = require("./handle");

/**
 * Fastify plugin to decorate the fastify instance with bam test handle methods.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  // Server decorators for maintaining test handles
  fastify.decorate('testHandles', new Map());
  fastify.decorate("getCreateTestHandle", (testId) => {
    if (!fastify.testHandles.has(testId)) {
      fastify.testHandles.set(testId, new TestHandle(testServer, testId));
    }

    return fastify.testHandles.get(testId);
  });
  fastify.decorate("destroyTestHandle", (testId) => {
    if (fastify.testHandles.has(testId)) {
      fastify.testHandles.delete(testId);
    }
  });

  // Reply decorators for resolving test handles
  fastify.decorateRequest('resolvingTestHandles', null);
  fastify.addHook('onRequest', async (request) => {
    request.resolvingTestHandles = new Set();
  })
  fastify.addHook("onResponse", async (request, reply) => {
    if (!request.resolvingTestHandles || request.resolvingTestHandles.size === 0) {
      return;
    }

    request.resolvingTestHandles.forEach(deferred => {
      deferred.resolve({
        request: {
          body: request.body,
          query: request.query,
          headers: request.headers,
          method: request.method.toUpperCase()
        },
        reply: {
          statusCode: reply.statusCode
        }
      })
    })
  });

  // Custom ajax capturing
  const customAjaxExpectResolver = (serverId) => {
    return async (request) => {
      const parsedUrl = new URL(
        request.url,
        "resolve://"
      )
      const testId = parsedUrl.pathname.match(/.*\/(.*$)/)

      if (!Array.isArray(testId) || testId.length < 2 || testId[1].length === '') {
        return;
      }

      const testHandle = fastify.getCreateTestHandle(testId[1]);
      if (!testHandle) {
        return;
      }

      const deferred = testHandle.getNextCustomAjaxExpects(serverId, request);
      if (deferred) {
        deferred.resolve({
          request: {
            body: request.body,
            query: request.query,
            headers: request.headers,
            method: request.method.toUpperCase()
          }
        })
      }
    }
  }
  testServer.assetServer.server.addHook('onRequest', customAjaxExpectResolver('assetServer'));
  // testServer.corsServer.server.addHook('onRequest', customAjaxExpectResolver('corsServer'));
  fastify.addHook('onRequest', customAjaxExpectResolver('bamServer'));
});
