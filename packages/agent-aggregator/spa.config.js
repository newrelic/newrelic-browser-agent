const path = require('path')

module.exports = {
  entry: './src/spa.js',
  output: {
    filename: 'nr-spa.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  }
}
