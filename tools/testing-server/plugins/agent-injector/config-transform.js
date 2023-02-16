const { Transform } = require('stream')
const debugShim = require('./debug-shim')
const sslShim = require('./ssl-shim')
const {
  defaultAgentConfig,
  loaderConfigKeys,
  loaderOnlyConfigKeys
} = require('../../constants')

/**
 * Constructs the agent config script block based on the config query and default
 * agent config from the test server.
 * @param {module:fastify.FastifyRequest} request
 * @param {module:fastify.FastifyReply} reply
 * @param {TestServer} testServer
 * @return {string}
 */
function getConfigContent (request, reply, testServer) {
  const queryConfig = (() => {
    try {
      return JSON.parse(
        Buffer.from(request.query.config || 'e30=', 'base64').toString()
      )
    } catch (error) {
      testServer.config.logger.error(
        `Invalid config query parameter for request ${request.url}`
      )
      testServer.config.logger.error(error)
      return {}
    }
  })()
  const config = {
    agent: `${testServer.assetServer.host}:${testServer.assetServer.port}/build/nr.js`,
    beacon: `${testServer.bamServer.host}:${testServer.bamServer.port}`,
    errorBeacon: `${testServer.bamServer.host}:${testServer.bamServer.port}`,
    ...defaultAgentConfig,
    ...queryConfig
  }

  let updatedConfig = {
    info: {},
    loaderConfig: {}
  }

  for (const key in config) {
    if (request.query.injectUpdatedLoaderConfig === 'true') {
      if (loaderConfigKeys.includes(key)) {
        // this simulates the collector injects only the primary app ID
        if (key === 'applicationID') {
          const primaryAppId = config[key].toString().split(',')[0]
          updatedConfig.loaderConfig[key] = primaryAppId
        } else {
          updatedConfig.loaderConfig[key] = config[key]
        }
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

  return `${sslShim}window.NREUM||(NREUM={});NREUM.info=${infoJSON};${loaderConfigAssignment}${
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

      if (chunkString.indexOf('{config}') > -1) {
        const replacement = getConfigContent(request, reply, testServer)
        done(
          null,
          chunkString.replace(
            '{config}',
            `<script type="text/javascript">${replacement}</script>`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
