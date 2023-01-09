const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const { merge } = require('webpack-merge');
const pkg = require('./package.json')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const { PUBLISH, SOURCEMAPS = true, PR_NAME, VERSION_OVERRIDE } = process.env
// this will change to package.json.version when it is aligned between all the packages
const VERSION = VERSION_OVERRIDE || fs.readFileSync('./VERSION', 'utf-8')
const SUBVERSION = 'NPM'

const IS_LOCAL = SUBVERSION === 'LOCAL'

console.log("VERSION", VERSION)
console.log("SOURCEMAPS", SOURCEMAPS)
console.log("PATH_VERSION", PATH_VERSION)
console.log("SUBVERSION", SUBVERSION)
console.log("PUBLIC_PATH", PUBLIC_PATH)
console.log("MAP_PATH", MAP_PATH)
console.log("IS_LOCAL", IS_LOCAL)
if (PR_NAME) console.log("PR_NAME", PR_NAME)

/**
 * Helper for configuring a source map plugin instance with some common properties.
 * @param {string} [filename] - Overrides the standard filename configuration.
 * @returns {SourceMapDevToolPlugin} Instance of SourceMapDevToolPlugin with default configurations.
 */
const instantiateSourceMapPlugin = (filename) => {
  return new webpack.SourceMapDevToolPlugin({
    append: MAP_PATH, // sourceMappingURL CDN route vs local route (for sourceMappingURL)
    filename: filename || (SUBVERSION === 'PROD' ? `[name].[hash:8].map` : `[name].map`),
    ...(JSON.parse(SOURCEMAPS) === false && { exclude: new RegExp(".*") }) // Exclude all files if disabled.
  })
}

/**
 * Helper for instantiating a bundle analyzer plugin with some common properties.
 * @param {string} build - Tags the HTML output filename (i.e.: webpack-analysis-[build].html)
 * @returns {BundleAnalyzerPlugin} Instance of BundleAnalyzerPlugin with default configurations.
 */
const instantiateBundleAnalyzerPlugin = (build) => {
  return new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false,
    defaultSizes: 'stat',
    reportFilename: path.resolve(__dirname, `./webpack-analysis-${build}.html`)
  })
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
    filename: `[name].js`,
    chunkFilename: SUBVERSION === 'PROD' ? `[name].[hash:8]${PATH_VERSION}.js` : `[name]${PATH_VERSION}.js`,
    path: path.resolve(__dirname, './build'),
    publicPath: PUBLIC_PATH, // CDN route vs local route (for linking chunked assets)
    library: {
      name: 'NRBA',
      type: 'self'
    },
    clean: false
  },
  plugins: [
    new webpack.DefinePlugin({
      'WEBPACK_PATCH_VERSION': JSON.stringify(PATCH)
      'WEBPACK_MINOR_VERSION': JSON.stringify(SUBVERSION || ''),
      'WEBPACK_MAJOR_VERSION': JSON.stringify(VERSION || ''),
      'WEBPACK_DEBUG': JSON.stringify(IS_LOCAL || false)
    })
  ]
}

// Targets modern browsers (ES6).
const standardConfig = merge(commonConfig, {
  entry: {
    [`nr-loader-rum${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/lite.js'),
    [`nr-loader-rum${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/lite.js'),
    [`nr-loader-full${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/pro.js'),
    [`nr-loader-full${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/pro.js'),
    [`nr-loader-spa${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/spa.js'),
    [`nr-loader-spa${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/spa.js'),
    [`nr-loader-mfe${PATH_VERSION}`]: path.resolve(__dirname, './src/cdn/microfrontend.js'),
    [`nr-loader-mfe${PATH_VERSION}.min`]: path.resolve(__dirname, './src/cdn/microfrontend.js')
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
  },
  plugins: [
    instantiateBundleAnalyzerPlugin('standard'),
    instantiateSourceMapPlugin()
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
                    "ie >= 11" // Does not affect webpack's own runtime output; see `target` webpack config property.
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
    /**
     * Because the ./agent-aggregator/aggregator.js dependency is async loaded, the output filename for that chunk will
     * be the same across all bundles in non-production builds (where dependency filenames aren't hashed) and will thus
     * overwrite with either an ES5 or ES6 target. For differentiated transpilation of dynamically loaded dependencies
     * in non-production builds, we can tag output filenames for chunks of the polyfills bundle with `-es5`.
     */
    chunkFilename: SUBVERSION === 'PROD' ? `[name].[hash:8]${PATH_VERSION}.js` : `[name]-es5${PATH_VERSION}.js`
  },
  plugins: [
    instantiateBundleAnalyzerPlugin('polyfills'),
    // Source map outputs must also must be tagged to prevent standard/polyfill filename collisions in non-production.
    instantiateSourceMapPlugin(SUBVERSION === 'PROD' ? `[name].[hash:8].map` : `[name]-es5.map`)
  ],
  target: 'browserslist:ie >= 11' // Applies to webpack's own runtime output; babel-loader only impacts bundled modules.
});

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
  plugins: [
    instantiateBundleAnalyzerPlugin('worker'),
    instantiateSourceMapPlugin()
  ],
  target: 'webworker'
});

module.exports = [standardConfig, polyfillsConfig, workerConfig]
