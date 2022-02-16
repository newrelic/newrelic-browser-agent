const path = require('path')

module.exports = {
  entry: './src/default.js',
  output: {
    filename: 'nr.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  }
}
