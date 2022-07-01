const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const pkg = require('./package.json')

const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  entry: {
    'nr-loader-rum': path.resolve(__dirname, './agent-loader/lite.js'),
    'nr-loader-rum.min': path.resolve(__dirname, './agent-loader/lite.js'),
    'nr-loader-full': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-full.min': path.resolve(__dirname, './agent-loader/pro.js'),
    'nr-loader-spa': path.resolve(__dirname, './agent-loader/spa.js'),
    'nr-loader-spa.min': path.resolve(__dirname, './agent-loader/spa.js'),
    'nr-polyfills': path.resolve(__dirname, './agent-loader/polyfills.js'),
    'nr-polyfills.min': path.resolve(__dirname, './agent-loader/polyfills.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
    publicPath: isProd ? 'https://js-agent.newrelic.com/' : '/build/', // CDN route vs local route (for linking chunked assets)
    library: {
      name: 'NRBA',
      type: 'umd'
    },
    clean: true
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: [/\.min\.js$/, /^(?:[0-9]{3})/], // TODO - Minimize chunks too
      terserOptions: {
        mangle: true
      }
    })],
    flagIncludedChunks: true,
    mergeDuplicateChunks: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SUBPATH': JSON.stringify(process.env.SUBPATH || ''),
      'process.env.VERSION': JSON.stringify(pkg.version || `-${process.env.VERSION}` || ''),
      'process.env.BUILD': JSON.stringify(process.env.BUILD || 'spa'),
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false)
    }),
    new webpack.SourceMapDevToolPlugin({
      append: isProd ? '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]' : '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]', // CDN route vs local route
      filename: '[name].map'
    })
  ],

  mode: isProd ? 'production' : 'development',
  devtool: false,
  target: "browserslist", // include this!!
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'entry',
                corejs: 3,
                targets: {
                  "chrome": "49",
                  "edge": "14",
                  "ie": "9", // <--- sauce 
                  "safari": "8",
                  "firefox": "5",
                  "android": "6",
                  "ios": "10.3"
                }
              }],
            ]
          }
        }
      }
    ]
  }
}

