const fp = require('fastify-plugin')
const applyBrowserifyTransform = require('./browserify-transform')
const { paths } = require('../../constants')

/**
 * Fastify plugin to apply transformations for test JS files that need to be
 * transpiled through browserify.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (
      !payload ||
      !payload.filename ||
      payload.filename.indexOf(paths.testsBrowserDir) === -1 ||
      !payload.filename.endsWith('.js')
    ) {
      return payload
    }

    reply.removeHeader('content-length')
    return payload.pipe(applyBrowserifyTransform(payload.filename, testServer))
  })
})
