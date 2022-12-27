const path = require('path')
const Dotenv = require('dotenv-webpack')
const webpack = require('webpack')
const pkg = require('../../dist/packages/browser-agent/package.json')

module.exports = {
  entry: path.join(__dirname, "../../dist/packages/browser-agent/index.js"),
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
      '@newrelic/browser-agent-core': path.resolve(__dirname, '../../packages/browser-agent-core'),
      '@newrelic/browser-agent': path.resolve(__dirname, '../../packages/browser-agent'),
      '@newrelic/browser-agent-custom': path.resolve(__dirname, '../../packages/browser-agent-custom'),
      '@newrelic/browser-agent-microfrontends': path.resolve(__dirname, '../../packages/browser-agent-microfrontends'),
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
