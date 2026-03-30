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
    <script>
      window.test = {
        agentLogCount: 0
      }
      console.debug = function (...args) {
        if (args[0] === "New Relic Warning: https://github.com/newrelic/newrelic-browser-agent/blob/main/docs/warning-codes.md#69") window.test.agentLogCount += 1;
      };
    </script>
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
    {loader}
    <script src="${script}.js"></script>
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent</h1>
  </body>
</html>`
const registeredIframeEntityHtmlTemplate = () => `<html>
  <head>
    <title>RUM Unit Test - Parent Page</title>
    {init}
    {config}
    <script>
      NREUM.init.api.allow_registered_children = true; // allow this parent page to accept registered entities (iframes) to report through it. This is required for the registered iframe entity tests, but not a default setting for security reasons, so we set it on a per test basis here.
    </script>
    {loader}
    <script src="browser-agent.js"></script>
  </head>
  <body>
    <h1>Parent Page - Main Agent Running</h1>
    <iframe id="mfe-iframe" src="registered-iframe-entity-iframe.html" width="800" height="400"></iframe>
  </body>
</html>`
const iframeContentTemplate = (script) => `<html>
  <head>
    <title>RUM Unit Test - Iframe Content</title>
    <script src="${script}.js"></script>
  </head>
  <body>
    <h1>Iframe Content - RegisteredEntity Interface</h1>
    <script>
      // Example usage of RegisteredEntity in iframe
      if (window.RegisteredIframeEntity) {
        window.entity = new window.RegisteredIframeEntity({
          id: 'iframe-test',
          name: 'iframe test'
        })
        console.log('RegisteredEntity created in iframe:', entity)
      }
    </script>
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
      'registered-iframe-entity': './src/registered-iframe-entity.js',
      // worker init script
      'worker-init': './src/worker-init.js'
    },
    output: {
      path: path.resolve(__dirname, '../../../tests/assets/test-builds/raw-src-wrapper')
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
        filename: 'registered-iframe-entity.html',
        minify: false,
        inject: false,
        templateContent: registeredIframeEntityHtmlTemplate()
      }),
      new HtmlWebpackPlugin({
        filename: 'registered-iframe-entity-iframe.html',
        minify: false,
        inject: false,
        templateContent: iframeContentTemplate('registered-iframe-entity')
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
      path: path.resolve(__dirname, '../../../tests/assets/test-builds/raw-src-wrapper')
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
