const { Transform } = require('stream')
const { regexReplacementRegex } = require('../../constants')

/**
 * Constructs the agent init script block based on the init query.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getInitContent (request, reply, testServer) {
  const queryInit = (() => {
    try {
      return JSON.parse(
        Buffer.from(request.query.init || 'e30=', 'base64').toString()
      )
    } catch (error) {
      testServer.config.logger.error(
        `Invalid init query parameter for request ${request.url}`
      )
      testServer.config.logger.error(error)
      return {}
    }
  })()

  let initJSON = JSON.stringify(queryInit)
  if (initJSON.includes('new RegExp')) {
    // de-serialize RegExp obj from router
    initJSON = initJSON.replace(regexReplacementRegex, '/$1/$2')
  }

  return `window.NREUM||(NREUM={});NREUM.init=${initJSON};NREUM.init.ssl=false;`
}

/**
 * Transforms requests for HTML files that contain the \{init\} string with the
 * default agent init merged with the deserialized init query param value, if
 * it was provided. The transform also injects the init option to disable SSL
 * to support testing the agent without the need for an SSL server.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    transform (chunk, encoding, done) {
      const chunkString = chunk.toString()

      if (chunkString.indexOf('{init}') > -1) {
        const replacement = getInitContent(request, reply, testServer)
        done(
          null,
          chunkString.replace(
            '{init}',
            `<script type="text/javascript">${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
