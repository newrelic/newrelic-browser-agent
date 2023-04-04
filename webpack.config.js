const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const { merge } = require('webpack-merge')
const babelEnv = require('./babel-env-vars')
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

let { PUBLISH, SOURCEMAPS = true, PR_NAME, VERSION_OVERRIDE } = process.env
// this will change to package.json.version when it is aligned between all the packages
let VERSION = VERSION_OVERRIDE || fs.readFileSync('./VERSION', 'utf-8')
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
    break
  case 'PR':
    PATH_VERSION = ''
    SUBVERSION = `${PR_NAME}`
    PUBLIC_PATH = `https://js-agent.newrelic.com/pr/${PR_NAME}/`
    MAP_PATH = `\n//# sourceMappingURL=https://js-agent.newrelic.com/pr/${PR_NAME}/[url]`
    VERSION = (Number(VERSION) + 1).toString()
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
if (PR_NAME) console.log('PR_NAME', PR_NAME)

/**
 * Helper for configuring a source map plugin instance with some common properties.
 * @param {string} [filename] - Overrides the standard filename configuration.
 * @returns {SourceMapDevToolPlugin} Instance of SourceMapDevToolPlugin with default configurations.
 */
const instantiateSourceMapPlugin = (filename) => {
  return new webpack.SourceMapDevToolPlugin({
    append: MAP_PATH, // sourceMappingURL CDN route vs local route (for sourceMappingURL)
    filename: filename || (['PROD', 'DEV', 'CURRENT'].includes(SUBVERSION) ? '[name].[chunkhash:8].map' : '[name].map'),
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
    chunkFilename: ['PROD', 'DEV', 'CURRENT'].includes(SUBVERSION) ? `[name].[chunkhash:8]${PATH_VERSION}.min.js` : `[name]${PATH_VERSION}.js`,
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
    [`nr-loader-spa${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/spa.js')
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
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: [
                    'last 10 Chrome versions',
                    'last 10 Safari versions',
                    'last 10 Firefox versions',
                    'last 10 Edge versions',
                    'last 10 ChromeAndroid versions',
                    'last 10 iOS versions'
                  ]
                }
              }]
            ],
            plugins: [
              babelEnv({ source: 'VERSION', subversion: SUBVERSION, distMethod: 'CDN' }),
              // Replaces template literals with concatenated strings. Some customers enclose snippet in backticks when
              // assigning to a variable, which conflicts with template literals.
              '@babel/plugin-transform-template-literals'
            ]
          }
        }
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
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'entry',
                corejs: { version: 3.23, proposals: true },
                loose: true,
                targets: {
                  browsers: [
                    'ie >= 11' // Does not affect webpack's own runtime output; see `target` webpack config property.
                  ]
                }
              }]
            ],
            plugins: [
              babelEnv({ source: 'VERSION', subversion: SUBVERSION, distMethod: 'CDN' })
            ]
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
    chunkFilename: ['PROD', 'DEV', 'CURRENT'].includes(SUBVERSION) ? `[name].[chunkhash:8]-es5${PATH_VERSION}.min.js` : `[name]-es5${PATH_VERSION}.js`
  },
  plugins: [
    ...instantiateBundleAnalyzerPlugin('polyfills'),
    // Source map outputs must also must be tagged to prevent standard/polyfill filename collisions in non-production.
    instantiateSourceMapPlugin(['PROD', 'DEV', 'CURRENT'].includes(SUBVERSION) ? '[name].[chunkhash:8]-es5.map' : '[name]-es5.map')
  ],
  target: 'browserslist:ie >= 11' // Applies to webpack's own runtime output; babel-loader only impacts bundled modules.
})

// Targets same modern browsers as standard configuration.
const workerConfig = merge(commonConfig, {
  entry: {
    [`nr-loader-worker${PATH_VERSION}`]: {
      import: path.resolve(__dirname, './src/cdn/worker.js'),
      chunkLoading: false
    },
    [`nr-loader-worker${PATH_VERSION}.min`]: {
      import: path.resolve(__dirname, './src/cdn/worker.js'),
      chunkLoading: false
    }
  },
  module: standardConfig.module,
  output: {
    globalObject: 'self',
    library: {
      name: 'NRBA',
      type: 'self'
    }
  },
  plugins: [
    ...instantiateBundleAnalyzerPlugin('worker'),
    instantiateSourceMapPlugin()
  ],
  target: 'webworker'
})

module.exports = [standardConfig, polyfillsConfig, workerConfig]
