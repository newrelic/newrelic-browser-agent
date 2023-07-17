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
    let attrs = ''
    try {
      attrs = decodeURIComponent(request?.query?.attributes)
    } catch (err) {
      // failed
    }
    if (attrs.includes('content_encoding=gzip')) request.headers['content-encoding'] = 'gzip'

    // sendBeacon does not add content-type header, and fastify compress apparently fails if no content-type is found
    if (!request.headers['content-type']) request.headers['content-type'] = 'text/plain'
    done(null, payload)
  })
})
