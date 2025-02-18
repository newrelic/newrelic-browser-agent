const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isProduction = process.env.NODE_ENV === 'production'
const htmlTemplate = (script) => `<!DOCTYPE html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    <script src="${script}.js"></script>
  </head>
  <body>
    <h1>This is a generic page that is wrapped by a library and the NPM agent</h1>
  </body>
</html>`

const config = [
  // standard config
  {
    cache: false,
    entry: {
      'apollo-client': './src/apollo-client.js',
      'reconnecting-websocket': './src/reconnecting-websocket.js',
      'robust-websocket': './src/robust-websocket.js'
    },
    output: {
      path: path.resolve(__dirname, '../../../tests/assets/test-builds/library-wrapper')
    },
    module: {
      parser: {
        javascript: {
          exportsPresence: 'error',
          importExportsPresence: 'error'
        }
      },
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
        filename: 'apollo-client.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('apollo-client')
      }),
      new HtmlWebpackPlugin({
        filename: 'reconnecting-websocket.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('reconnecting-websocket')
      }),
      new HtmlWebpackPlugin({
        filename: 'robust-websocket.html',
        minify: false,
        inject: false,
        templateContent: htmlTemplate('robust-websocket')
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
