const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'nr-spa.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: false
  }
};