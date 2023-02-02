const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./index.js",
  output: {
    filename: "build-time-mfe.js",
    path: path.resolve(
      __dirname,
      "../../../../tests/assets/test-builds/build-time-mfe"
    ),
    // path: path.resolve(__dirname, './dist'),
    library: {
      name: "container",
      type: "umd",
    },
    chunkFormat: "module",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
