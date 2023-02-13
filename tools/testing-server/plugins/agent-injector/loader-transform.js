const { Transform } = require('stream')
const path = require('path')
const fs = require('fs')
const sslShim = require('./ssl-shim')
const { paths } = require('../../constants')

/**
 * Constructs the agent script block based on the loader query and default
 * loader config from the test server.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {Promise<string>}
 */
async function getLoaderContent (request, reply, testServer) {
  const loader = request.query.loader || testServer.config.loader
  const loaderFilePath = path.join(
    paths.builtAssetsDir,
    `nr-loader-${loader}${
      testServer.config.polyfills ? '-polyfills' : ''
    }.min.js`
  )
  const loaderFileStats = await fs.promises.stat(loaderFilePath)

  if (!loaderFileStats.isFile()) {
    throw new Error(`Could not find loader file ${loaderFilePath}`)
  }

  return (await fs.promises.readFile(loaderFilePath)).toString()
}

/**
 * Transforms requests for HTML files that contain the \{loader\} string with the
 * built loader JS. By default, the full loader will be used but can be overriden
 * by passing the loader query param. If polyfills are enabled via CLI, the polyfill
 * version of the loader will be injected instead.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      const chunkString = chunk.toString()

      if (chunkString.indexOf('{loader}') > -1) {
        const replacement = await getLoaderContent(request, reply, testServer)
        done(
          null,
          chunkString.replace(
            '{loader}',
            `<script type="text/javascript">${sslShim}${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
