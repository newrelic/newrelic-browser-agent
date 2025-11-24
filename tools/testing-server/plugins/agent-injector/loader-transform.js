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
    `nr-loader-${loader}.min.js`
  )
}

async function getLoaderScript (scriptType, loaderFilePath, nonce, injectionDelay) {
  const delay = parseInt(injectionDelay, 10)

  switch (scriptType) {
    case 'defer':
      return `<script src="${loaderFilePath}" defer ${nonce}></script>`
    case 'async':
      return `<script src="${loaderFilePath}" async ${nonce}></script>`
    case 'injection':
      return `<script type="text/javascript" ${nonce}>
        window.addEventListener('load', function () {
        let script = document.createElement('script');
        script.src = "${loaderFilePath}";
        script.nonce = "${nonce}";
        ${delay >= 0 ? 'setTimeout(function () {' : ''}
        document.body.append(script);
        ${delay >= 0 ? '}, ' + injectionDelay + ');' : ''}
        })
      </script>`
    case 'scriptTag':
      return `<script src="${loaderFilePath}" ${nonce}></script>`
    default:
      return `<script type="text/javascript" ${nonce}>${await getLoaderContent(loaderFilePath)}</script>`
  }
}

/**
 * Transforms requests for HTML files that contain the \{loader\} string with the
 * built loader JS. By default, the full loader will be used but can be overriden
 * by passing the loader query param.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      let chunkString = chunk.toString()
      const nonce = request.query.nonce ? `nonce="${request.query.nonce}"` : ''

      function replaceLoaderPlaceholder (chunkString, loaderScript) {
        return chunkString.replace(
          '{loader}',
          `<script type="text/javascript" ${nonce}>${sslShim()}</script>${loaderScript}`
        )
      }
      while (chunkString.indexOf('{loader}') > -1) {
        const loaderFilePath = getLoaderFilePath(request, testServer, ['defer', 'async', 'injection', 'scriptTag'].includes(request.query?.script))
        const loaderScript = await getLoaderScript(request.query?.script, loaderFilePath, nonce, request.query?.injectionDelay)
        chunkString = replaceLoaderPlaceholder(chunkString, loaderScript)
      }
      done(null, chunkString)
    }
  })
}
