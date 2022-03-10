const path = require('path');
const Dotenv = require('dotenv-webpack');

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
    })
  ],
  optimization: {
    minimize: false
  },
  devtool: 'source-map'
};