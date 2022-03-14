const path = require('path')
const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  entry:  {
    // 'nr-loader-rum': path.resolve(__dirname, './agent-loader/lite.js'),
    // 'nr-loader-rum.min': path.resolve(__dirname, './agent-loader/lite.js'),
    'nr-loader-rum': path.resolve(__dirname, './agent-loader/test.js'),
    'nr-loader-rum.min': path.resolve(__dirname, './agent-loader/test.js'),
    'nr-loader-full': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-full.min': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-spa': path.resolve(__dirname, './agent-loader/spa.js'),
    'nr-loader-spa.min': path.resolve(__dirname, './agent-loader/spa.js'),
    'nr': path.resolve(__dirname, './agent-aggregator/basic.js'),
    'nr.min': path.resolve(__dirname, './agent-aggregator/basic.js'),
    'nr-spa': path.resolve(__dirname, './agent-aggregator/spa.js'),
    'nr-spa.min': path.resolve(__dirname, './agent-aggregator/spa.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
    // publicPath: 'https://js-agent.newrelic.com/test/',
    publicPath: 'http://bam-test-1.nr-local.net:3333/build/',
    libraryTarget: 'umd',
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
		}),
    new webpack.SourceMapDevToolPlugin({
      append: '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]',
      filename: '[name].map',
    })
  ],
  // devtool: 'source-map'
  devtool: false
}
