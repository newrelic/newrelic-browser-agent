const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

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
    {loader}
    <script src="${script}.js"></script>
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
