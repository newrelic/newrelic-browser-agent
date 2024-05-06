const fp = require('fastify-plugin')

/**
 * Fastify plugin to intercept requests before they reach the static plugin. This will set
 * proper cache headers on requests for asset files to prevent those files from being cached.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 */
module.exports = fp(async function (fastify) {
  fastify.addHook('preParsing', (request, reply, payload, done) => {
    if (request.routeOptions.url === '/*') {
      delete request.headers['if-none-match']
      delete request.headers['if-modified-since']
      request.headers['cache-control'] = 'no-cache'
      request.headers.pragma = 'no-cache'
    }

    done(null, payload)
  })
})
