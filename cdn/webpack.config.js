const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

// this will change to package.json.version when it is aligned between all the packages
const VERSION = fs.readFileSync('../VERSION', 'utf-8')
const {PUBLISH, SOURCEMAPS = true} = process.env
let PATH_VERSION, SUBVERSION, PUBLIC_PATH, MAP_PATH

switch (PUBLISH) {
  case 'PROD':
    PATH_VERSION = `-${VERSION}`
    SUBVERSION = 'PROD'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]'
    break
  case 'CURRENT':
    PATH_VERSION = `-current`
    SUBVERSION = 'PROD'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]'
    break
  case 'DEV':
    PATH_VERSION = ``
    SUBVERSION = 'DEV'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/dev/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/dev/[url]'
    break
  case 'EXTENSION':
    // build for extension injection
    PATH_VERSION = ``
    SUBVERSION = 'EXTENSION'
    PUBLIC_PATH = 'http://localhost:3333/build/'
    MAP_PATH = '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]'
    break
  default:
  // local build
  PATH_VERSION = ``
  SUBVERSION = 'LOCAL'
  PUBLIC_PATH = '/build/'
  MAP_PATH = '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]'
}

const IS_LOCAL = SUBVERSION === 'LOCAL'

console.log("VERSION", VERSION)
console.log("SOURCEMAPS", SOURCEMAPS)
console.log("PATH_VERSION", PATH_VERSION)
console.log("SUBVERSION", SUBVERSION)
console.log("PUBLIC_PATH", PUBLIC_PATH)
console.log("MAP_PATH", MAP_PATH)
console.log("IS_LOCAL", IS_LOCAL)

module.exports = {
  entry: {
    [`nr-loader-rum${PATH_VERSION}`]: [path.resolve(__dirname, './agent-loader/lite.js')],
    [`nr-loader-rum${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/lite.js'),
    [`nr-loader-full${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/pro.js'),
    [`nr-loader-full${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/pro.js'),
    [`nr-loader-spa${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/spa.js'),
    [`nr-loader-spa${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/spa.js'),
    [`nr-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills.js')
  },
  output: {
    filename: `[name].js`,
    chunkFilename: SUBVERSION === 'PROD' ? `[name].[hash:8]${PATH_VERSION}.js` : `[name]${PATH_VERSION}.js`,
    path: path.resolve(__dirname, '../build'),
    publicPath: PUBLIC_PATH, // CDN route vs local route (for linking chunked assets)
    library: {
      name: 'NRBA',
      type: 'umd'
    },
    clean: true
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: [/\.min\.js$/, /^(?:[0-9])/],
      terserOptions: {
        mangle: true
      }
    })],
    flagIncludedChunks: true,
    mergeDuplicateChunks: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'WEBPACK_MINOR_VERSION': JSON.stringify(SUBVERSION || ''),
      'WEBPACK_MAJOR_VERSION': JSON.stringify(VERSION || ''),
      'WEBPACK_DEBUG': JSON.stringify(IS_LOCAL || false)
    }),
    new webpack.SourceMapDevToolPlugin({
      append: MAP_PATH, // CDN route vs local route
      filename: SUBVERSION === 'PROD' ? `[name].[hash:8].map` : `[name].map`,
      ...(JSON.parse(SOURCEMAPS) === false && {exclude: new RegExp(".*")}) // exclude all files if disabled
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: path.resolve(__dirname, './webpack-analysis.html')
    })
  ],

  mode: !IS_LOCAL ? 'production' : 'development',
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

