const { Transform } = require('stream')
const debugShim = require('./debug-shim')
const {
  agentConfig,
  loaderConfigKeys,
  loaderOnlyConfigKeys
} = require('../../constants')
const { deserialize } = require('../../../shared/serializer.js')

/**
 * Constructs the agent config script block based on the config query and default
 * agent config from the test server.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getConfigContent (request, reply, testServer) {
  let queryConfig
  try {
    if (request.query.config) {
      queryConfig = deserialize(
        Buffer.from(request.query.config, 'base64').toString()
      )
    }
  } catch (error) {
    testServer.config.logger.error(
      `Invalid config query parameter for request ${request.url}`
    )
    testServer.config.logger.error(error)
  }

  const config = {
    agent: `${testServer.assetServer.host}:${testServer.assetServer.port}/build/nr.js`,
    beacon: `${testServer.bamServer.host}:${testServer.bamServer.port}`, // these will be overridden by agentConfig if supplied
    errorBeacon: `${testServer.bamServer.host}:${testServer.bamServer.port}`, // these will be overridden by agentConfig if supplied
    ...agentConfig,
    ...queryConfig
  }

  let updatedConfig = {
    info: {},
    loaderConfig: {}
  }

  for (const key in config) {
    if (request.query.injectUpdatedLoaderConfig === 'true' && loaderConfigKeys.includes(key)) {
      // this simulates the collector injects only the primary app ID
      if (key === 'applicationID') {
        const primaryAppId = config[key].toString().split(',')[0]
        updatedConfig.loaderConfig[key] = primaryAppId
      } else {
        updatedConfig.loaderConfig[key] = config[key]
      }
    }

    // add all keys to `info` except the ones that exist only in `loader_config`
    if (!loaderOnlyConfigKeys.includes(key)) {
      updatedConfig.info[key] = config[key]
    }
  }

  const infoJSON = JSON.stringify(updatedConfig.info)
  const loaderConfigJSON = JSON.stringify(updatedConfig.loaderConfig)
  const loaderConfigAssignment = request.query.injectUpdatedLoaderConfig
    ? `NREUM.loader_config=${loaderConfigJSON};`
    : ''

  return `window.NREUM||(NREUM={});NREUM.info=${infoJSON};${loaderConfigAssignment}${
    testServer.config.debugShim ? debugShim : ''
  }`
}

/**
 * Transforms requests for HTML files that contain the \{config\} string with the
 * default agent config merged with the deserialized config query param value, if
 * it was provided. The transform also injects the debug shim if debugging has been
 * enabled via the CLI.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    transform (chunk, encoding, done) {
      const chunkString = chunk.toString()
      const nonce = request.query.nonce ? `nonce="${request.query.nonce}"` : ''

      if (chunkString.indexOf('{config}') > -1) {
        const replacement = getConfigContent(request, reply, testServer)
        done(
          null,
          chunkString.replace(
            '{config}',
            `<script type="text/javascript" ${nonce}>${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
