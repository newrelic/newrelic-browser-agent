const path = require('path')
const { Transform } = require('stream')
const { paths } = require('../../constants')
const fs = require('fs')

/**
 * Transforms requests for HTML files that contain string matchers for the injection
 * of scripts.
 *
 * {script-injection} will be replaced with base64 decoded script query parameter
 * {script} will be replaced with a script tag where the src attribute is the script query parameter
 * {tests/assets/.*} will be replaced with file contents of the given path
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      let chunkString = chunk.toString()

      // Replace {tests/assets/.*}
      const testScriptInjections = chunkString.matchAll(
        new RegExp(
          `{(${path.relative(paths.rootDir, paths.testsAssetsDir)}/.*?)}`,
          'ig'
        )
      )
      for (let match of testScriptInjections) {
        const scriptPath = path.resolve(paths.rootDir, match[1])
        const scriptFileStats = await fs.promises.stat(scriptPath)

        if (!scriptFileStats.isFile()) {
          throw new Error(`Could not find script file ${match[1]}`)
        }

        const script = (await fs.promises.readFile(scriptPath)).toString()
        chunkString = chunkString.replace(
          match[0],
          `<script type="text/javascript">${script}</script>`
        )
      }

      // Replace {script}
      if (chunkString.indexOf('{script}') > -1) {
        chunkString = chunkString.replace(
          '{script}',
          `<script type="text/javascript" src="${
            request.query.script || ''
          }"></script>`
        )
      }

      // Replace {script-injection}
      if (chunkString.indexOf('{script-injection}') > -1) {
        let scriptContent = ''
        if (testServer.config.polyfills && request.query.scriptString) { // if the test is running in IE11, the test scriptString may need Babel transpilation
          const { Readable } = require('stream')
          const { processScript } = require('../browser-scripts/browser-scripts-transform')

          // Decode base64 string back to bytes then convert it to a stream. scriptString must not be empty.
          const scriptStream = Readable.from(Buffer.from(request.query.scriptString, 'base64'))
          scriptContent = await processScript(scriptStream, true)
        } else {
          scriptContent = Buffer.from(request.query.scriptString || '', 'base64').toString()
        }

        chunkString = chunkString.replace(
          '{script-injection}',
          `<script type="text/javascript">${scriptContent}</script>`
        )
      }

      done(null, chunkString)
    }
  })
}
