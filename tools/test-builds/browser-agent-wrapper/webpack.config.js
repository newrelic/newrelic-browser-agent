// Webpack uses this to work with directories
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// This is the main configuration object.
// Here, you write different options and tell Webpack what to do
module.exports = {

  // Path to your entry point. From this file Webpack will begin its work
  entry: './index.js',

  // Path and filename of your result bundle.
  // Webpack will bundle all JavaScript into this file
  output: {
    path: path.resolve(__dirname, '../../../tests/assets/test-builds/browser-agent-wrapper'),
    publicPath: '',
    filename: 'bundle.js'
  },
  plugins: [new HtmlWebpackPlugin({
    template: './index.html',
    scriptLoading: 'blocking',
    inject: 'head'
  })],
};