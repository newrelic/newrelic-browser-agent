const { Transform } = require('stream')
const { defaultInitBlock } = require('../../constants')
const { deepmerge } = require('deepmerge-ts')
const { deserialize } = require('../../../shared/serializer.js')

/**
 * Constructs the agent init script block based on the init query.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getInitContent (request, reply, testServer) {
  let queryInit
  try {
    if (request.query.init) {
      queryInit = deserialize(
        Buffer.from(request.query.init, 'base64').toString()
      )
    }
  } catch (error) {
    testServer.config.logger.error(
      `Invalid init query parameter for request ${request.url}`
    )
    testServer.config.logger.error(error)
  }

  let initJSON = JSON.stringify(deepmerge(defaultInitBlock, queryInit || {}), (k, v) => {
    if (v instanceof RegExp) {
      // de-serialize RegExp obj from router
      return `new RegExp(${v.toString()})`
    }
    return v
  })

  initJSON = initJSON.replace(/"new RegExp\((.*?)\)"/g, 'new RegExp($1)')

  return `window.addEventListener("newrelic",function(evt){window.nrLoaded=true});window.NREUM||(NREUM={});NREUM.init=${initJSON};NREUM.init.ssl=false;`
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
      const nonce = request.query.nonce ? `nonce="${request.query.nonce}"` : ''

      if (chunkString.indexOf('{init}') > -1) {
        const replacement = getInitContent(request, reply, testServer)
        done(
          null,
          chunkString.replace(
            '{init}',
            `<script type="text/javascript" ${nonce}>${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
