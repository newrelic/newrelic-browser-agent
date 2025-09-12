const fp = require('fastify-plugin')
const querypack = require('@newrelic/nr-querypack')

const beaconRequestsRegex = /^((\/((events)|(jserrors)|(ins)|(resources)))?\/(1|2)\/)|(\/browser\/blobs)/i

/**
 * Fastify plugin to add a custom text/plain content parser that uses querypack.
 * @param {import('fastify').FastifyInstance} fastify the fastify server instance
 * @param {TestServer} testServer test server instance
 */
module.exports = fp(async function (fastify, testServer) {
  fastify.addContentTypeParser(
    'text/plain',
    { parseAs: 'string' },
    (request, body, done) => {
      if (!body || typeof body !== 'string' || body.trim().length === 0) return done(null, body)

      if (request.url.match(beaconRequestsRegex)) {
        if (body.startsWith('bel.')) {
          try {
            return done(null, querypack.decode(body))
          } catch (error) {
            return done(error, body)
          }
        } else {
          try {
            return done(null, JSON.parse(body))
          } catch (error) {
            return done(error, body)
          }
        }
      }

      done(null, body)
    }
  )
})
