const path = require('path')

module.exports = {
  entry: './src/lite.js',
  output: {
    filename: 'nr-loader-rum.js',
    path: path.resolve(__dirname, 'dist'),
    // publicPath: 'https://js-agent.newrelic.com/test/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  }
}
