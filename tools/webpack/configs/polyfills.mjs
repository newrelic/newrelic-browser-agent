import path from 'path'
import webpack from 'webpack'
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
  const entryGroups = [
    {
      asyncChunkName: 'nr-rum-polyfills',
      entry: {
        'nr-loader-rum-polyfills': path.join(env.paths.src, 'cdn/polyfills/lite.js'),
        'nr-loader-rum-polyfills.min': path.join(env.paths.src, 'cdn/polyfills/lite.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.indexOf('aggregate') > -1) {
              // Only allow page_view_event, page_view_timing, and metrics features
              return !resource.match(/(page_view_event|page_view_timing|metrics)\/aggregate/)
            }

            return false
          }
        })
      ]
    },
    {
      asyncChunkName: 'nr-full-polyfills',
      entry: {
        'nr-loader-full-polyfills': path.join(env.paths.src, 'cdn/polyfills/pro.js'),
        'nr-loader-full-polyfills.min': path.join(env.paths.src, 'cdn/polyfills/pro.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.indexOf('aggregate') > -1) {
              // Allow all features except spa and session_replay
              return resource.match(/(spa|session_replay)\/aggregate/)
            }

            return false
          }
        })
      ]
    },
    {
      asyncChunkName: 'nr-spa-polyfills',
      entry: {
        'nr-loader-spa-polyfills': path.join(env.paths.src, 'cdn/polyfills/spa.js'),
        'nr-loader-spa-polyfills.min': path.join(env.paths.src, 'cdn/polyfills/spa.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.indexOf('aggregate') > -1) {
              // Do not allow session_replay feature
              return resource.match(/(session_replay)\/aggregate/)
            }

            return false
          }
        })
      ]
    },
    {
      asyncChunkName: 'nr-polyfills',
      entry: {
        'nr-polyfills.min': path.resolve(env.paths.src, 'cdn/polyfills.js')
      },
      plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1
        })
      ]
    }
  ]

  return entryGroups.map(entryGroup => {
    return merge(commonConfig(env, entryGroup.asyncChunkName), {
      target: 'browserslist:ie >= 11',
      entry: entryGroup.entry,
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
        ...entryGroup.plugins,
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          defaultSizes: 'stat',
          reportFilename: `${entryGroup.asyncChunkName}${env.PATH_VERSION}.stats.html`
        }),
        new BundleAnalyzerPlugin({
          analyzerMode: 'json',
          openAnalyzer: false,
          defaultSizes: 'stat',
          reportFilename: `${entryGroup.asyncChunkName}${env.PATH_VERSION}.stats.json`
        })
      ]
    })
  })
}
