const fp = require('fastify-plugin')
const applyLoaderTransform = require('./loader-transform')
const applyConfigTransformer = require('./config-transform')
const applyInitTransform = require('./init-transform')
const applyWorkerCommandsTransform = require('./worker-commands-transform')
const applyScriptTransform = require('./script-transform')
const applyPolyfillsTransform = require('./polyfills-transform')
const { paths } = require('../../constants')

/**
 * Fastify plugin to apply transformations for test HTML files for the injection
 * of the agent and other supported testing and configuration scripts.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.addHook('onSend', (request, reply, payload, done) => {
    if (
      payload &&
      payload.filename &&
      payload.filename.indexOf(paths.testsAssetsDir) > -1 &&
      payload.filename.endsWith('.html')
    ) {
      payload = payload
        .pipe(applyLoaderTransform(request, reply, testServer))
        .pipe(applyConfigTransformer(request, reply, testServer))
        .pipe(applyInitTransform(request, reply, testServer))
        .pipe(applyWorkerCommandsTransform(request, reply, testServer))
        .pipe(applyScriptTransform(request, reply, testServer))
        .pipe(applyPolyfillsTransform(request, reply, testServer))
    }

    reply.removeHeader('content-length')
    done(null, payload)
  })
})
