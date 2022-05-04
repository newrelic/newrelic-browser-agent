const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './index.js',
  output: {
    filename: 'build-time-mfe.js',
    path: path.resolve(__dirname, '../../../../tests/assets/test-builds/build-time-mfe'),
    library: {
      name: 'container',
      type: 'umd'
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html'
    })
  ]
}
