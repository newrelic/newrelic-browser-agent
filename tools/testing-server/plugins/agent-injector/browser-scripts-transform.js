const { Transform } = require('stream')
const browserify = require('browserify')
const preprocessify = require('preprocessify')
const fse = require('fs-extra')
const path = require('path')

async function processScript (scriptPath) {
  if (!scriptPath) return ''
  try {
    const reRoutedPath = 'tests/assets/scripts/tests' + scriptPath.split('/tests').pop()
    const prebuiltFile = await fse.readFile(path.join(process.cwd(), reRoutedPath))
    if (prebuiltFile) return prebuiltFile
    return browserifyScript(scriptPath)
  } catch (err) {
    return browserifyScript(scriptPath)
  }
}

function browserifyScript (scriptPath) {
  return new Promise((resolve, reject) => {
    browserify(scriptPath)
      .transform('babelify', {
        envName: 'test',
        presets: [
          [
            '@babel/preset-env',
            {
              loose: true,
              targets: {
                browsers: [
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
          ['@babel/plugin-proposal-optional-chaining', { loose: true }],
          ['@babel/plugin-proposal-nullish-coalescing-operator', { loose: true }],
          ['@babel/plugin-proposal-logical-assignment-operators', { loose: true }],
          ['@babel/plugin-proposal-class-properties', { loose: true }], // Addresses a problem handling static class properties.
          ['@babel/plugin-proposal-private-methods', { loose: true }] // Enables class private methods.
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
}

/**
 * Transforms requests for JS files by passing them through browserify for transpilation.
 */
module.exports = function (scriptPath, testServer) {
  return new Transform({
    async transform (chunk, encoding, done) {
      const transformedScript = await processScript(
        scriptPath
      )
      done(null, transformedScript)
    }
  })
}

module.exports.processScript = processScript
