const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const {PUBLISH, SOURCEMAPS = true, PR_NAME, VERSION_OVERRIDE} = process.env
// this will change to package.json.version when it is aligned between all the packages
let VERSION = VERSION_OVERRIDE || fs.readFileSync('../VERSION', 'utf-8')
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
  case 'PR':
    PATH_VERSION = ``
    SUBVERSION = `${PR_NAME}`
    PUBLIC_PATH = `https://js-agent.newrelic.com/pr/${PR_NAME}/`
    MAP_PATH = `\n//# sourceMappingURL=https://js-agent.newrelic.com/pr/${PR_NAME}/[url]`
    VERSION = (Number(VERSION)+1).toString()
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
if (PR_NAME) console.log("PR_NAME", PR_NAME)

// The exported configs (standard, polyfill, webworker) compose from this common config.
const commonConfig = {
  devtool: false, // defer to SourceMapDevToolPlugin
  mode: !IS_LOCAL ? 'production' : 'development',
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
  output: {
    filename: `[name].js`,
    chunkFilename: SUBVERSION === 'PROD' ? `[name].[hash:8]${PATH_VERSION}.js` : `[name]${PATH_VERSION}.js`,
    path: path.resolve(__dirname, '../build'),
    publicPath: PUBLIC_PATH, // CDN route vs local route (for linking chunked assets)
    library: {
      name: 'NRBA',
      type: 'self'
    },
    clean: false
  },
  plugins: [
    new webpack.DefinePlugin({
      'WEBPACK_MINOR_VERSION': JSON.stringify(SUBVERSION || ''),
      'WEBPACK_MAJOR_VERSION': JSON.stringify(VERSION || ''),
      'WEBPACK_DEBUG': JSON.stringify(IS_LOCAL || false)
    }),
    new webpack.SourceMapDevToolPlugin({
      append: MAP_PATH, // sourceMappingURL CDN route vs local route (for sourceMappingURL)
      filename: SUBVERSION === 'PROD' ? `[name].[hash:8].map` : `[name].map`,
      ...(JSON.parse(SOURCEMAPS) === false && { exclude: new RegExp(".*") }) // exclude all files if disabled
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: path.resolve(__dirname, './webpack-analysis.html')
    })
  ],
  resolve: {
    alias: {
      '@newrelic/browser-agent-core/src': path.resolve(__dirname, '../packages/browser-agent-core/src')
    }
  }
}

// Targets modern browsers (ES6).
const standardConfig = {
  ...commonConfig,
  ...{
    entry: {
        [`nr-loader-rum${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/lite.js'),
        [`nr-loader-rum${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/lite.js'),
        [`nr-loader-full${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/pro.js'),
        [`nr-loader-full${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/pro.js'),
        [`nr-loader-spa${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/spa.js'),
        [`nr-loader-spa${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/spa.js'),
    },
    target: 'web',
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
                  targets: {
                    browsers: [
                      "last 10 Chrome versions",
                      "last 10 Safari versions",
                      "last 10 Firefox versions",
                      "last 10 Edge versions"
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
}

// Targets Internet Explorer 11 (ES5).
const polyfillConfig = {
  ...commonConfig,
  ...{
    entry: {
      [`nr-loader-rum-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/polyfills/lite.js'),
      [`nr-loader-rum-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills/lite.js'),
      [`nr-loader-full-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/polyfills/pro.js'),
      [`nr-loader-full-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills/pro.js'),
      [`nr-loader-spa-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './agent-loader/polyfills/spa.js'),
      [`nr-loader-spa-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills/spa.js'),
      [`nr-loader-spa-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills/spa.js'),
      [`nr-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './agent-loader/polyfills.js'),
    },
    target: 'browserslist',
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
                  corejs: { version: 3.23, proposals: true },
                  loose: true,
                  targets: {
                    browsers: [
                      "ie >= 11"
                    ]
                  }
                }]
              ]
            }
          }
        }
      ]
    },
    output: {
      ...commonConfig.output,
      ...{
        // Because the ./agent-aggregator/aggregator.js dependency is async loaded, the output filename for that chunk will be the
        // same across all bundles in non-production builds (where filenames aren't hashed) and will thus overwrite with either an
        // ES5 or ES6 target. For differentiated transpilation of dynamically loaded dependencies in non-production builds, we can
        // tag output filenames for chunks of the polyfills bundle with `-es5`.
        chunkFilename: SUBVERSION === 'PROD' ? `[name].[hash:8]${PATH_VERSION}.js` : `[name]-es5${PATH_VERSION}.js`,
      }
    },
    plugins: [
      commonConfig.plugins[0],
      new webpack.SourceMapDevToolPlugin({
        append: MAP_PATH, // sourceMappingURL CDN route vs local route (for sourceMappingURL)
        filename: SUBVERSION === 'PROD' ? `[name].[hash:8].map` : `[name]-es5.map`, // tag in non-production to prevent filename collisions
        ...(JSON.parse(SOURCEMAPS) === false && { exclude: new RegExp(".*") }) // exclude all files if disabled
      }),
      commonConfig.plugins[2]
    ]
  }
}

// Targets same modern browsers as standard configuration.
const webworkerConfig = {
  ...commonConfig,
  ...{
    entry: {
      [`nr-loader-worker${PATH_VERSION}`]: {
        import: path.resolve(__dirname, './agent-loader/worker.js'),
        chunkLoading: false
      },
      [`nr-loader-worker${PATH_VERSION}.min`]: {
        import: path.resolve(__dirname, './agent-loader/worker.js'),
        chunkLoading: false
      }
    },
    target: 'webworker',
    module: standardConfig.module
  }
}

module.exports = [polyfillConfig, standardConfig, webworkerConfig]
