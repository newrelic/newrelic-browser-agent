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
async function getLoaderContent (loaderFilePath) {
  let file
  try {
    file = (await fs.promises.readFile(loaderFilePath)).toString()
  } catch (_) {
    throw new Error(`Could not find loader file ${loaderFilePath}`)
  }
  return file
}

function getLoaderFilePath (request, testServer, webpath) {
  const loader = request.query.loader || testServer.config.loader
  return path.join(
    webpath ? '/build/' : paths.builtAssetsDir,
    `nr-loader-${loader}${
      testServer.config.polyfills ? '-polyfills' : ''
    }.min.js`
  )
}

async function getLoaderScript (scriptType, loaderFilePath) {
  switch (scriptType) {
    case 'defer':
      return `<script src="${loaderFilePath}" defer></script>`
    case 'async':
      return `<script src="${loaderFilePath}" async></script>`
    case 'injection':
      return `<script type="text/javascript">
        window.addEventListener('load', function(){
        let script = document.createElement('script');
        script.src = "${loaderFilePath}";
        document.body.append(script);
        })
      </script>`
    default:
      return `<script type="text/javascript">${await getLoaderContent(loaderFilePath)}</script>`
  }
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
        const loaderFilePath = getLoaderFilePath(request, testServer, !!request.query?.script)
        const loaderScript = await getLoaderScript(request.query?.script, loaderFilePath)
        done(
          null,
          chunkString.replace(
            '{loader}',
            `<script type="text/javascript">${sslShim}</script>${loaderScript}`
          )
        )
      } else {
        done(null, chunkString)
      }
    }
  })
}
