const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'nr-loader-spa.js',
    // path: path.resolve(__dirname, 'dist'),
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'https://js-agent.newrelic.com/test/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  }
}
