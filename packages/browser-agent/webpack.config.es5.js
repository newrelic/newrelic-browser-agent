const path = require('path')
const Dotenv = require('dotenv-webpack')
const webpack = require('webpack')
const pkg = require('./package.json')

module.exports = {
  entry: './dist/bundled/es6/index.js',
  target: ['web', 'es5'],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist/bundled/es5'),
    filename: 'index.js',
    library: {
      name: 'NRBA',
      type: 'umd'
    },
    chunkFormat: 'module'
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
    })
  ],
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  mode: 'production'
}
