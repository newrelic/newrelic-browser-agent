const path = require('path');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack')
const pkg = require('./package.json')

module.exports = {
  entry: './dist/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
   library: {
     name: 'nrBrowserCore',
     type: 'umd',
   },
  },
  plugins: [
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
    }),
    new webpack.DefinePlugin({
      'process.env.SUBPATH': JSON.stringify(process.env.SUBPATH || ''),
      'process.env.VERSION': JSON.stringify(pkg.version || `-${process.env.VERSION}` || ''),
      'process.env.BUILD': JSON.stringify(process.env.BUILD || 'spa'),
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false),
    }),
  ],
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
};