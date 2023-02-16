const fp = require('fastify-plugin')
const querypack = require('@newrelic/nr-querypack')

const beaconRequestsRegex = new RegExp(
  '^/1/|/events/1/|/jserrors/1/|/ins/1/|/resources/1/',
  'i'
)

/**
 * Fastify plugin to add a custom text/plain content parser that uses querypack.
 * @param {module:fastify.FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.addContentTypeParser(
    'text/plain',
    { parseAs: 'string' },
    (request, body, done) => {
      if (request.url.match(beaconRequestsRegex)) {
        if (body.startsWith('bel.')) {
          try {
            done(null, querypack.decode(body))
          } catch (error) {
            done(error, body)
          }
        } else {
          try {
            done(null, JSON.parse(body))
          } catch (error) {
            done(error, body)
          }
        }
      }

      done(null, body)
    }
  )
})
