const path = require('path')
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry:  path.resolve(__dirname, './index.js'),
  output: {
    filename: 'nr-loader-rum.js',
    path: path.resolve(__dirname, '../../dist'),
    // publicPath: 'https://js-agent.newrelic.com/test/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
		})
  ]
}
