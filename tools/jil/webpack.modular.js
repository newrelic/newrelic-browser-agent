const path = require('path')
const Dotenv = require('dotenv-webpack')
const webpack = require('webpack')
const pkg = require('../../dist/packages/browser-agent/package.json')

module.exports = {
  entry: path.join(__dirname, "../../dist/packages/browser-agent/src/index.js"),
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        }
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, '../../tests/assets/js/internal/modular'),
    publicPath: "/tests/assets/js/internal/modular/",
    filename: 'index.js',
    library: {
      name: 'NRBA',
      type: 'umd'
    }
  },
  resolve: {
    alias: {
      '@newrelic/browser-agent-core/src': path.resolve(__dirname, '../../dist/packages/browser-agent-core/src')
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SUBPATH': JSON.stringify(process.env.SUBPATH || ''),
      'process.env.VERSION': JSON.stringify(pkg.version || ''),
      'process.env.BUILD': JSON.stringify(process.env.BUILD || 'spa'),
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false)
    })
  ],
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  mode: 'production'
}
