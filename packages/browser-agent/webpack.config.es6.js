const path = require('path')
const Dotenv = require('dotenv-webpack')
const webpack = require('webpack')
const pkg = require('./package.json')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist/bundled/es6'),
    filename: 'index.js',
    library: {
      name: 'NRBA',
      type: 'umd'
    }
  },

  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env')
    }),
    new webpack.DefinePlugin({
      'process.env.SUBPATH': JSON.stringify(process.env.SUBPATH || ''),
      'process.env.VERSION': JSON.stringify(pkg.version || ''),
      'process.env.BUILD': JSON.stringify(process.env.BUILD || 'spa'),
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false)
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: '../../webpack-analysis.html'
    })
  ],
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  mode: 'production'
}
