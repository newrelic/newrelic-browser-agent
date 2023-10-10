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
      asyncChunkName: 'nr-worker',
      entry: {
        'nr-loader-worker': {
          import: path.resolve(env.paths.src, 'cdn/worker.js'),
          chunkLoading: 'import-scripts'
        },
        'nr-loader-worker.min': {
          import: path.resolve(env.paths.src, 'cdn/worker.js'),
          chunkLoading: 'import-scripts'
        }
      },
      plugins: [
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            if (context.match(/features\/utils/) && resource.indexOf('aggregate') > -1) {
              // Only allow page_view_event, page_action, metrics, errors, and xhr features
              return !resource.match(/(page_view_event|page_action|metrics|jserrors|ajax)\/aggregate/)
            }

            return false
          }
        })
      ]
    }
  ]

  return entryGroups.map(entryGroup => {
    return merge(commonConfig(env, entryGroup.asyncChunkName), {
      target: 'webworker',
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
              },
              {
                loader: './tools/webpack/loaders/develblock/index.mjs',
                options: {
                  enabled: env.SUBVERSION === 'PROD'
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
