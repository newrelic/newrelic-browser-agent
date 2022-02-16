const path = require('path')

module.exports = {
  entry: './src/pro.js',
  output: {
    filename: 'nr-loader-full.js',
    path: path.resolve(__dirname, 'dist'),
    // publicPath: 'https://js-agent.newrelic.com/test/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  }
}
