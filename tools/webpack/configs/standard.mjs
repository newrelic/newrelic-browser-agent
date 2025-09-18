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
      asyncChunkName: 'nr-rum',
      entry: {
        'nr-loader-rum': path.join(env.paths.src, 'cdn/lite.js'),
        'nr-loader-rum.min': path.join(env.paths.src, 'cdn/lite.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.endsWith('aggregate')) {
              // Only allow page_view_event, page_view_timing, and metrics features
              return !/(page_view_event|page_view_timing|metrics)\/aggregate/.test(resource)
            }

            return false
          }
        })
      ]
    },
    {
      asyncChunkName: 'nr-full',
      entry: {
        'nr-loader-full': path.join(env.paths.src, 'cdn/pro.js'),
        'nr-loader-full.min': path.join(env.paths.src, 'cdn/pro.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.endsWith('aggregate')) {
              // Allow all features except spa
              return /(spa)\/aggregate/.test(resource)
            }

            return false
          }
        })
      ]
    },
    {
      asyncChunkName: 'nr-spa',
      entry: {
        'nr-loader-spa': path.join(env.paths.src, 'cdn/spa.js'),
        'nr-loader-spa.min': path.join(env.paths.src, 'cdn/spa.js')
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            // Spa allows all feature aggs
            return false
          }
        })
      ]
    }
  ]

  if (env.SUBVERSION !== 'PROD') {
    entryGroups.push({
      asyncChunkName: 'nr-experimental',
      entry: {
        'nr-loader-experimental': path.join(env.paths.src, 'cdn/experimental.js'),
        'nr-loader-experimental.min': path.join(env.paths.src, 'cdn/experimental.js')
      },
      plugins: []
    })
  }

  return entryGroups.map(entryGroup => {
    return merge(commonConfig(env, entryGroup.asyncChunkName), {
      target: 'web',
      entry: entryGroup.entry,
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: [
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
        ...entryGroup.plugins,
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          defaultSizes: 'stat',
          reportFilename: `${entryGroup.asyncChunkName}-standard${env.PATH_VERSION}.stats.html`
        }),
        new BundleAnalyzerPlugin({
          analyzerMode: 'json',
          openAnalyzer: false,
          defaultSizes: 'stat',
          reportFilename: `${entryGroup.asyncChunkName}-standard${env.PATH_VERSION}.stats.json`
        })
      ]
    })
  })
}
