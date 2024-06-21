const path = require('path')
const { Transform } = require('stream')
const { paths } = require('../../constants')
const fse = require('fs-extra')

/**
 * Transforms requests for HTML files that contain the \{polyfills\} string with the
 * browserified source from cdn/agent-loader/polyfills/polyfills.js.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      const chunkString = chunk.toString()
      const nonce = request.query.nonce ? `nonce="${request.query.nonce}"` : ''

      if (
        chunkString.indexOf('{polyfills}') > -1 &&
        testServer.config.polyfills
      ) {
        let polyfills
        try {
          polyfills = await fse.readFile(path.resolve(paths.rootDir, 'build/nr-polyfills.min.js'))
        } catch (err) {
          console.log(err)
        }
        done(
          null,
          chunkString.replace(
            '{polyfills}',
            `<script type="text/javascript" ${nonce}>${polyfills}</script>`
          )
        )
      } else if (
        chunkString.indexOf('{polyfills}') > -1 &&
        !testServer.config.polyfills
      ) {
        done(null, chunkString.replace('{polyfills}', ''))
      } else {
        done(null, chunkString)
      }
    }
  })
}
