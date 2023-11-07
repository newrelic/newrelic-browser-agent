const path = require('path')
const { Transform } = require('stream')
const { paths } = require('../../constants')
const fs = require('fs')

/**
 * Transforms requests for HTML files that contain string matchers for the injection
 * of scripts.
 *
 * {script} will be replaced with a script tag where the src attribute is the script query parameter
 * {tests/assets/.*} will be replaced with file contents of the given path
 */
module.exports = function (request, reply, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      let chunkString = chunk.toString()
      const nonce = request.query.nonce ? `nonce="${request.query.nonce}"` : ''

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
          `<script type="text/javascript" ${nonce}>${script}</script>`
        )
      }

      // Replace {script}
      if (chunkString.indexOf('{script}') > -1) {
        chunkString = chunkString.replace(
          '{script}',
          `<script type="text/javascript" ${nonce} src="${
            request.query.script || ''
          }"></script>`
        )
      }

      done(null, chunkString)
    }
  })
}
