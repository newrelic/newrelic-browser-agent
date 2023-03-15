const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isProduction = process.env.NODE_ENV == 'production'
const htmlTemplate = (script) => `<html>
  <head>
    <title>RUM Unit Test</title>
    {init}
    {config}
    <script src="${script}.js"></script>
    {script-injection}
  </head>
  <body>
    <h1>This is a generic page that is instrumented by the NPM agent</h1>
  </body>
</html>`
const config = {
  cache: false,
  entry: {
    // 'browser-agent': './src/browser-agent.js',
    'custom-agent-lite': './src/custom-agent-lite.js',
    // 'custom-agent-pro': './src/custom-agent-pro.js',
    // 'custom-agent-spa': './src/custom-agent-spa.js',
    // 'micro-agent': './src/micro-agent.js',
    // 'worker-agent': './src/worker-agent.js'
  },
  output: {
    path: path.resolve(__dirname, '../../../tests/assets/test-builds/browser-agent-wrapper'),
    clean: true
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
    })
  ]
}

module.exports = () => {
  if (isProduction) {
    config.mode = 'production'
  } else {
    config.mode = 'development'
  }
  return config
}
