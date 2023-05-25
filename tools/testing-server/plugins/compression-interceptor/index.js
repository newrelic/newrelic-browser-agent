const fp = require('fastify-plugin')

/**
 * Fastify plugin to intercept requests before they reach the compressor plugin.  We implement
 * a non-standard gzip convention, where the compression identifier is passed through a query param.
 * This plugin decorates the request with the correct headers if that param is detected, to allow the
 * fastly compression plugin to work as expected.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addHook('preParsing', (request, reply, payload, done) => {
    if (request.query.content_encoding === 'gzip') request.headers['content-encoding'] = 'gzip'

    done(null, payload)
  })
})
