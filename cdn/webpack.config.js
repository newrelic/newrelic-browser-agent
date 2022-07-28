const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const isProd = process.env.NODE_ENV === 'production'

// this will change to package.json.version when it is aligned between all the packages
const VERSION = isProd ? `-${fs.readFileSync('../VERSION', 'utf-8')}` : ``

module.exports = {
  entry: {
    [`nr-loader-rum${VERSION}`]: [path.resolve(__dirname, './agent-loader/lite.js')],
    [`nr-loader-rum${VERSION}.min`]: path.resolve(__dirname, './agent-loader/lite.js'),
    [`nr-loader-full${VERSION}`]: path.resolve(__dirname, './agent-loader/pro.js'),
    [`nr-loader-full${VERSION}.min`]: path.resolve(__dirname, './agent-loader/pro.js'),
    [`nr-loader-spa${VERSION}`]: path.resolve(__dirname, './agent-loader/spa.js'),
    [`nr-loader-spa${VERSION}.min`]: path.resolve(__dirname, './agent-loader/spa.js'),
    [`nr-polyfills${VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills.js')
  },
  output: {
    filename: `[name].js`,
    chunkFilename: `[name]${VERSION}.js`,
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
      'process.env.DEBUG': JSON.stringify(!isProd || false)
    }),
    new webpack.SourceMapDevToolPlugin({
      append: isProd ? '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]' : '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]', // CDN route vs local route
      filename: '[name].map'
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: path.resolve(__dirname, './webpack-analysis.html')
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
                corejs: {version: 3.23, proposals: true},
                loose: true,
                targets: {
                  browsers: [
                    "chrome >= 60",
                    "safari >= 11",
                    "firefox >= 56",
                    "ios >= 10.3",
                    "ie >= 11",
                    "edge >= 60"
                  ]
                }
              }]
            ]
          }
        }
      }
    ]
  }
}

