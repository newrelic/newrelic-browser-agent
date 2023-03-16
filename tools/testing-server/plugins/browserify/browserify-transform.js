const { Transform } = require('stream')
const browserify = require('browserify')
const preprocessify = require('preprocessify')
const babelEnv = require('../../../../babel-env-vars')

function browserifyScript (scriptPath, enablePolyfills) {
  return new Promise((resolve, reject) => {
    browserify(scriptPath)
      .transform('babelify', {
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
          '@babel/plugin-syntax-dynamic-import',
          '@babel/plugin-transform-modules-commonjs',
          '@babel/plugin-proposal-optional-chaining',
          // Replaces template literals with concatenated strings. Some customers enclose snippet in backticks when
          // assigning to a variable, which conflicts with template literals.
          '@babel/plugin-transform-template-literals',
          babelEnv('VERSION') // babel-plugin-transform-inline-environment-variables
        ],
        global: true
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
      const transformedScript = await browserifyScript(
        scriptPath,
        testServer.config.polyfills
      )
      done(null, transformedScript)
    }
  })
}

module.exports.browserifyScript = browserifyScript
