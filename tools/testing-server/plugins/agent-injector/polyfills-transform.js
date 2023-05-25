const path = require('path')
const { Transform } = require('stream')
const { paths } = require('../../constants')
const fse = require('fs-extra')
const { processScript } = require('../browser-scripts/browser-scripts-transform')

/**
 * Transforms requests for HTML files that contain the \{polyfills\} string with the
 * browserified source from cdn/agent-loader/polyfills/polyfills.js.
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      const chunkString = chunk.toString()

      if (
        chunkString.indexOf('{polyfills}') > -1 &&
        testServer.config.polyfills
      ) {
        let polyfills
        try {
          polyfills = await fse.readFile(path.resolve(paths.rootDir, 'build/nr-polyfills.min.js'))
        } catch (err) {
          polyfills = await processScript(
            path.resolve(paths.rootDir, 'src/cdn/polyfills.js')
          )
        }
        done(
          null,
          chunkString.replace(
            '{polyfills}',
            `<script type="text/javascript">${polyfills}</script>`
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
