const path = require('path')
// const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const pkg = require('./package.json')

module.exports = {
  entry: {
    'nr-loader-rum': path.resolve(__dirname, './agent-loader/lite.js'),
    'nr-loader-rum.min': path.resolve(__dirname, './agent-loader/lite.js'),
    'nr-loader-full': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-full.min': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-spa': path.resolve(__dirname, './agent-loader/spa.js'),
    'nr-loader-spa.min': path.resolve(__dirname, './agent-loader/spa.js')
    // 'nr': path.resolve(__dirname, './agent-aggregator/basic.js'),
    // 'nr.min': path.resolve(__dirname, './agent-aggregator/basic.js'),
    // 'nr-spa': path.resolve(__dirname, './agent-aggregator/spa.js'),
    // 'nr-spa.min': path.resolve(__dirname, './agent-aggregator/spa.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
    // publicPath: 'https://js-agent.newrelic.com/',
    // publicPath: 'http://bam-test-1.nr-local.net:3333/build/',
    publicPath: '/build/',
    libraryTarget: 'umd'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: [/\.min\.js$/] // TODO - Minimize chunks too
    })],
    // splitChunks: {
    //   chunks: 'all',
    // },
    chunkIds: 'named',
    moduleIds: 'named',
    flagIncludedChunks: true,
    mergeDuplicateChunks: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SUBPATH': JSON.stringify(process.env.SUBPATH || ''),
      'process.env.VERSION': JSON.stringify(pkg.version || `-${process.env.VERSION}` || ''),
      'process.env.BUILD': JSON.stringify(process.env.BUILD || 'spa'),
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false)
    }),
    new webpack.SourceMapDevToolPlugin({
      append: '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]',
      filename: '[name].map'
    })
  ],
  devtool: false
}

