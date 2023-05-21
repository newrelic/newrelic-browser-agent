const { Transform } = require('stream')
const browserify = require('browserify')
const preprocessify = require('preprocessify')
const fse = require('fs-extra')
const path = require('path')

function processScript (scriptPath, enablePolyfills) {
  return new Promise((resolve, reject) => {
    const reRoutedPath = 'tests/assets/scripts/tests' + scriptPath.split('/tests').pop()
    fse.readFile(path.join(process.cwd(), reRoutedPath)).then(f => {
      resolve(f)
    }).catch(() => {
      browserify(scriptPath)
        .transform('babelify', {
          envName: 'test',
          presets: [
            [
              '@babel/preset-env',
              {
                loose: true,
                targets: {
                  browsers: enablePolyfills
                    ? ['ie >= 11']
                    : [
                        'last 10 Chrome versions',
                        'last 10 Safari versions',
                        'last 10 Firefox versions',
                        'last 10 Edge versions',
                        'last 10 ChromeAndroid versions',
                        'last 10 iOS versions'
                      ]
                }
              }
            ]
          ],
          plugins: [
            '@babel/plugin-proposal-optional-chaining',
            '@babel/plugin-proposal-nullish-coalescing-operator',
            '@babel/plugin-proposal-logical-assignment-operators',
            '@babel/plugin-proposal-class-properties', // Addresses a problem handling static class properties.
            '@babel/plugin-proposal-private-methods' // Enables class private methods.
          ]
        })
        .transform(preprocessify())
        .bundle((err, buf) => {
          if (err) {
            return reject(err)
          }

          let content = buf.toString()
          resolve(content)
        })
    })
  })
}

/**
 * Transforms requests for JS files by passing them through browserify for transpilation.
 */
module.exports = function (scriptPath, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      const transformedScript = await processScript(
        scriptPath,
        testServer.config.polyfills
      )
      done(null, transformedScript)
    }
  })
}

module.exports.processScript = processScript
