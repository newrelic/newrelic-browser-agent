import path from 'path'
import { merge } from 'webpack-merge'
import commonConfig from './common.mjs'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

/**
 * @typedef {import('../index.mjs').WebpackBuildOptions} WebpackBuildOptions
 */

/**
 * Returns a webpack configuration that is shared by all agent webpack
 * builds.
 * @param {WebpackBuildOptions} env Build variables passed into the webpack cli
 * using --env foo=bar --env biz=baz
 */
export default (env) => {
  return merge(commonConfig(env), {
    target: 'browserslist:ie >= 11',
    entry: {
      'nr-loader-rum-polyfills': path.resolve(env.paths.src, 'cdn/polyfills/lite.js'),
      'nr-loader-rum-polyfills.min': path.resolve(env.paths.src, 'cdn/polyfills/lite.js'),
      'nr-loader-full-polyfills': path.resolve(env.paths.src, 'cdn/polyfills/pro.js'),
      'nr-loader-full-polyfills.min': path.resolve(env.paths.src, 'cdn/polyfills/pro.js'),
      'nr-loader-spa-polyfills': path.resolve(env.paths.src, 'cdn/polyfills/spa.js'),
      'nr-loader-spa-polyfills.min': path.resolve(env.paths.src, 'cdn/polyfills/spa.js'),
      'nr-polyfills.min': path.resolve(env.paths.src, 'cdn/polyfills.js')
    },
    output: {
      chunkFilename: env.SUBVERSION === 'PROD' ? `[name].[chunkhash:8]-es5${env.PATH_VERSION}.min.js` : `[name]-es5${env.PATH_VERSION}.js`
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
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        defaultSizes: 'stat',
        reportFilename: `polyfills${env.PATH_VERSION}.stats.html`
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: 'json',
        openAnalyzer: false,
        defaultSizes: 'stat',
        reportFilename: `polyfills${env.PATH_VERSION}.stats.json`
      })
    ]
  })
}
