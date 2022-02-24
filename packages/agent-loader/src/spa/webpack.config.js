const path = require('path')
const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  entry:  {
    'nr-loader-spa': path.resolve(__dirname, './index.js'),
    'nr-loader-spa.min': path.resolve(__dirname, './index.js')
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../../dist'),
    // publicPath: 'https://js-agent.newrelic.com/test/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: /\.min\.js$/
    })]
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
		})
  ]
}
