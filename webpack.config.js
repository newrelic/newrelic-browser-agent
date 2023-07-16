const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const { merge } = require('webpack-merge')
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

let { PUBLISH, SOURCEMAPS = true, COVERAGE = 'false', PR_NAME, BRANCH_NAME, VERSION_OVERRIDE } = process.env
// this will change to package.json.version when it is aligned between all the packages
let VERSION = VERSION_OVERRIDE || pkg.version
let PATH_VERSION, SUBVERSION, PUBLIC_PATH, MAP_PATH

switch (PUBLISH) {
  case 'PROD':
    PATH_VERSION = `-${VERSION}`
    SUBVERSION = 'PROD'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]'
    SOURCEMAPS = false
    break
  case 'CURRENT':
    PATH_VERSION = '-current'
    SUBVERSION = 'PROD'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/[url]'
    SOURCEMAPS = false
    break
  case 'DEV':
    PATH_VERSION = ''
    SUBVERSION = 'DEV'
    PUBLIC_PATH = 'https://js-agent.newrelic.com/dev/'
    MAP_PATH = '\n//# sourceMappingURL=https://js-agent.newrelic.com/dev/[url]'
    VERSION = `${VERSION}-dev`
    break
  case 'PR':
    PATH_VERSION = ''
    SUBVERSION = `${PR_NAME}`
    PUBLIC_PATH = `https://js-agent.newrelic.com/pr/${PR_NAME}/`
    MAP_PATH = `\n//# sourceMappingURL=https://js-agent.newrelic.com/pr/${PR_NAME}/[url]`
    VERSION = `${VERSION}-${PR_NAME.toLowerCase()}`
    break
  case 'EXPERIMENT':
    PATH_VERSION = ''
    SUBVERSION = `${BRANCH_NAME}`
    PUBLIC_PATH = `https://js-agent.newrelic.com/experiments/${BRANCH_NAME}/`
    MAP_PATH = `\n//# sourceMappingURL=https://js-agent.newrelic.com/experiments/${BRANCH_NAME}/[url]`
    VERSION = `${VERSION}-${BRANCH_NAME.toLowerCase()}`
    break
  case 'EXTENSION':
    // build for extension injection
    PATH_VERSION = ''
    SUBVERSION = 'EXTENSION'
    PUBLIC_PATH = 'http://localhost:3333/build/'
    MAP_PATH = '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]'
    break
  case 'NPM':
    // build for extension injection
    PATH_VERSION = ''
    SUBVERSION = 'NPM'
    PUBLIC_PATH = '/dist/'
    MAP_PATH = '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]'
    break
  default:
    // local build
    PATH_VERSION = ''
    SUBVERSION = 'LOCAL'
    PUBLIC_PATH = '/build/'
    MAP_PATH = '\n//# sourceMappingURL=http://bam-test-1.nr-local.net:3333/build/[url]'
}

const IS_LOCAL = SUBVERSION === 'LOCAL'

console.log('VERSION', VERSION)
console.log('SOURCEMAPS', SOURCEMAPS)
console.log('PATH_VERSION', PATH_VERSION)
console.log('SUBVERSION', SUBVERSION)
console.log('PUBLIC_PATH', PUBLIC_PATH)
console.log('MAP_PATH', MAP_PATH)
console.log('IS_LOCAL', IS_LOCAL)
console.log('COVERAGE', COVERAGE)
if (PR_NAME) console.log('PR_NAME', PR_NAME)
if (BRANCH_NAME) console.log('BRANCH_NAME', BRANCH_NAME)
process.env.BUILD_VERSION = VERSION
process.env.BUILD_ENV = SUBVERSION

/**
 * Helper for configuring a source map plugin instance with some common properties.
 * @param {string} [filename] - Overrides the standard filename configuration.
 * @returns {SourceMapDevToolPlugin} Instance of SourceMapDevToolPlugin with default configurations.
 */
const instantiateSourceMapPlugin = (filename) => {
  return new webpack.SourceMapDevToolPlugin({
    append: MAP_PATH, // sourceMappingURL CDN route vs local route (for sourceMappingURL)
    filename: filename || (SUBVERSION !== 'LOCAL' ? '[name].[chunkhash:8].map' : '[name].map'),
    ...(JSON.parse(SOURCEMAPS) === false && { exclude: new RegExp('.*') }) // Exclude all files if disabled.
  })
}

/**
 * Helper for instantiating a bundle analyzer plugin with some common properties.
 * @param {string} build - Tags the HTML output filename (i.e.: webpack-analysis-[build].html)
 * @returns {BundleAnalyzerPlugin[]} Instance of BundleAnalyzerPlugin with default configurations.
 */
const instantiateBundleAnalyzerPlugin = (build) => {
  return [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: `${build}${PATH_VERSION}.stats.html`
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      openAnalyzer: false,
      defaultSizes: 'stat',
      reportFilename: `${build}${PATH_VERSION}.stats.json`
    })
  ]
}

// The exported configs (standard, polyfill, webworker) build on this common config.
const commonConfig = {
  devtool: false, // Defer to SourceMapDevToolPlugin.
  mode: !IS_LOCAL ? 'production' : 'development',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      include: [/\.min\.js$/, /^(?:[0-9])/],
      terserOptions: {
        mangle: {
          keep_fnames: /nrWrapper/
        }
      }
    })],
    flagIncludedChunks: true,
    mergeDuplicateChunks: true
  },
  output: {
    filename: '[name].js',
    chunkFilename: SUBVERSION !== 'LOCAL' ? `[name].[chunkhash:8]${PATH_VERSION}.min.js` : `[name]${PATH_VERSION}.js`,
    path: path.resolve(__dirname, './build'),
    publicPath: PUBLIC_PATH, // CDN route vs local route (for linking chunked assets)
    clean: false
  }
}

// Targets modern browsers (ES6).
const standardConfig = merge(commonConfig, {
  entry: {
    [`nr-loader-rum${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/lite.js'),
    [`nr-loader-rum${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/lite.js'),
    [`nr-loader-full${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/pro.js'),
    [`nr-loader-full${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/pro.js'),
    [`nr-loader-spa${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/spa.js'),
    [`nr-loader-spa${PATH_VERSION}.min`]: path.resolve(__dirname, PUBLISH === 'EXPERIMENT' ? './src/cdn/experimental.js' : './src/cdn/spa.js'),
    ...(SUBVERSION === 'LOCAL' && { [`nr-loader-experimental${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/experimental.js') }),
    ...(SUBVERSION === 'LOCAL' && { [`nr-loader-experimental${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/experimental.js') })
  },
  output: {
    globalObject: 'window',
    library: {
      name: 'NRBA',
      type: 'window'
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: COVERAGE === 'true'
          ? [
              { loader: './tools/webpack/loaders/istanbul/index.mjs' },
              {
                loader: 'babel-loader',
                options: {
                  envName: 'webpack'
                }
              }
            ]
          : [
              {
                loader: 'babel-loader',
                options: {
                  envName: 'webpack'
                }
              }
            ]
      }
    ]
  },
  plugins: [
    instantiateSourceMapPlugin(),
    ...instantiateBundleAnalyzerPlugin('standard')
  ],
  target: 'web'
})

// Targets Internet Explorer 11 (ES5).
const polyfillsConfig = merge(commonConfig, {
  entry: {
    [`nr-loader-rum-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/polyfills/lite.js'),
    [`nr-loader-rum-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/polyfills/lite.js'),
    [`nr-loader-full-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/polyfills/pro.js'),
    [`nr-loader-full-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/polyfills/pro.js'),
    [`nr-loader-spa-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/polyfills/spa.js'),
    [`nr-loader-spa-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/polyfills/spa.js'),
    [`nr-loader-spa-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/polyfills/spa.js'),
    ...(SUBVERSION === 'LOCAL' && { [`nr-loader-experimental-polyfills${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/experimental.js') }),
    ...(SUBVERSION === 'LOCAL' && { [`nr-loader-experimental-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/experimental.js') }),
    [`nr-polyfills${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/polyfills.js')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            envName: 'webpack-ie11'
          }
        }
      }
    ]
  },
  output: {
    globalObject: 'window',
    library: {
      name: 'NRBA',
      type: 'window'
    },
    /**
     * Because the ./agent-aggregator/aggregator.js dependency is async loaded, the output filename for that chunk will
     * be the same across all bundles in non-production builds (where dependency filenames aren't hashed) and will thus
     * overwrite with either an ES5 or ES6 target. For differentiated transpilation of dynamically loaded dependencies
     * in non-production builds, we can tag output filenames for chunks of the polyfills bundle with `-es5`.
     */
    chunkFilename: SUBVERSION !== 'LOCAL' ? `[name].[chunkhash:8]-es5${PATH_VERSION}.min.js` : `[name]-es5${PATH_VERSION}.js`
  },
  plugins: [
    ...instantiateBundleAnalyzerPlugin('polyfills'),
    // Source map outputs must also must be tagged to prevent standard/polyfill filename collisions in non-production.
    instantiateSourceMapPlugin(SUBVERSION !== 'LOCAL' ? '[name].[chunkhash:8]-es5.map' : '[name]-es5.map')
  ],
  target: 'browserslist:ie >= 11' // Applies to webpack's own runtime output; babel-loader only impacts bundled modules.
})

// Targets same modern browsers as standard configuration.
const workerConfig = merge(commonConfig, {
  entry: {
    [`nr-loader-worker${PATH_VERSION}`]: {
      import: path.resolve(__dirname, './src/cdn/worker.js'),
      chunkLoading: 'import-scripts'
    },
    [`nr-loader-worker${PATH_VERSION}.min`]: {
      import: path.resolve(__dirname, './src/cdn/worker.js'),
      chunkLoading: 'import-scripts'
    }
  },
  module: standardConfig.module,
  output: {
    globalObject: 'self',
    library: {
      name: 'NRBA',
      type: 'self'
    },
    chunkFilename: SUBVERSION !== 'LOCAL' ? `[name].[chunkhash:8]-worker${PATH_VERSION}.min.js` : `[name]-worker${PATH_VERSION}.js`
  },
  plugins: [
    ...instantiateBundleAnalyzerPlugin('worker'),
    instantiateSourceMapPlugin()
  ],
  target: 'webworker'
})

module.exports = [standardConfig, polyfillsConfig, workerConfig]
