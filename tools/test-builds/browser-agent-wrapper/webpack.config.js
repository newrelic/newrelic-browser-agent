const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { webpackCacheGroup } = require('@newrelic/browser-agent/tools/bundler-tools')

const isProduction = process.env.NODE_ENV === 'production'
const htmlTemplate = (script) => `<html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    <script src="${script}.js"></script>
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent</h1>
  </body>
</html>`
const multiAgentHtmlTemplate = `<html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    <script src="browser-agent.js"></script>
    <script src="micro-agent.js"></script>
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent. It has a main agent and a micro agent running together.</h1>
  </body>
</html>`
const workerHtmlTemplate = `<html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    {worker-commands}
    <script src="worker-init.js"></script>
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent</h1>
  </body>
</html>`
const registeredEntityHtmlTemplate = (script) => `<html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    <script>
      localStorage.clear()
      NREUM.init.page_view_timing.enabled = false
      NREUM.init.session_replay.enabled = false
      NREUM.init.session_trace.enabled = false
    </script>
    {loader}
    <script src="${script}.js"></script>
    <script>
      // set up generic MFEs expected by tests
      window.agent1 = new RegisteredEntity({
        id: 1,
        name: 'agent1'
      })
      window.agent2 = new RegisteredEntity({
        id: 2,
        name: 'agent2'
      })

      // preload ajax calls
      const CONTAINER_XHR = new XMLHttpRequest()
      CONTAINER_XHR.open('GET', '/mock/pre/42')
      CONTAINER_XHR.send()

      const MFE_XHR_1 = new XMLHttpRequest()
      MFE_XHR_1.open('GET', '/mock/pre/1')
      MFE_XHR_1.setRequestHeader('newrelic-mfe-id', 1)
      MFE_XHR_1.send()

      const MFE_XHR_2 = new XMLHttpRequest()
      MFE_XHR_2.open('GET', '/mock/pre/2')
      MFE_XHR_2.setRequestHeader('newrelic-mfe-id', 2)
      MFE_XHR_2.send()

      fetch('/mock/pre/42')

      fetch('/mock/pre/1', {
        headers: {
          'newrelic-mfe-id': 1
        }
      })

      fetch('/mock/pre/2', {
        headers: {
          'newrelic-mfe-id': 2
        }
      })

    </script>
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent</h1>
  </body>
</html>`

const config = [
  // standard config
  {
    cache: false,
    entry: {
      'browser-agent': './src/browser-agent.js',
      'custom-agent-lite': './src/custom-agent-lite.js',
      'custom-agent-pro': './src/custom-agent-pro.js',
      'custom-agent-pro-deprecated-features': './src/custom-agent-pro-deprecated-features.js',
      'custom-agent-spa': './src/custom-agent-spa.js',
      'micro-agent': './src/micro-agent.js',
      'registered-entity': './src/registered-entity.js',
      // worker init script
      'worker-init': './src/worker-init.js'
    },
    output: {
      path: path.resolve(__dirname, '../../../tests/assets/test-builds/browser-agent-wrapper')
    },
    optimization: {
      minimize: false,
      splitChunks: {
        cacheGroups: {
          ...webpackCacheGroup(),
          microAgent: {
            test: /micro-agent\.js$/,
            name: 'micro-agent',
            chunks: 'all',
            enforce: true
          }
        }
      }
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/i,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
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
              ]
            }
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'browser-agent.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('browser-agent')
      }),
      new HtmlWebpackPlugin({
        filename: 'custom-agent-lite.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('custom-agent-lite')
      }),
      new HtmlWebpackPlugin({
        filename: 'custom-agent-pro.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('custom-agent-pro')
      }),
      new HtmlWebpackPlugin({
        filename: 'custom-agent-pro-deprecated-features.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('custom-agent-pro-deprecated-features')
      }),
      new HtmlWebpackPlugin({
        filename: 'custom-agent-spa.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('custom-agent-spa')
      }),
      new HtmlWebpackPlugin({
        filename: 'micro-agent.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('micro-agent')
      }),
      new HtmlWebpackPlugin({
        filename: 'registered-entity.html',
        minify: false,
        inject: false,
        templateContent: registeredEntityHtmlTemplate('registered-entity')
      }),
      new HtmlWebpackPlugin({
        filename: 'multi-agent.html',
        minify: false,
        inject: false,
        templateContent: multiAgentHtmlTemplate
      })
    ]
  },
  // worker config
  {
    cache: false,
    target: 'webworker',
    entry: {
      'worker-wrapper': {
        import: './src/worker-wrapper.js',
        chunkLoading: false
      }
    },
    output: {
      path: path.resolve(__dirname, '../../../tests/assets/test-builds/browser-agent-wrapper')
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/i,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
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
              ]
            }
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'worker-agent.html',
        minify: false,
        inject: false,
        templateContent: workerHtmlTemplate
      })
    ]
  }
]

module.exports = () => {
  if (isProduction) {
    config.mode = 'production'
  } else {
    config.mode = 'development'
  }
  return config
}
