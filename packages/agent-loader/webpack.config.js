const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'nr-loader-webpack.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: false
  }
};