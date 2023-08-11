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
      plugins: []
    }
  ]

  return entryGroups.map(entryGroup => {
    return merge(commonConfig(env, entryGroup.asyncChunkName), {
      target: 'webworker',
      entry: entryGroup.entry,
      output: {
        chunkFilename: env.SUBVERSION === 'PROD' ? `[name].[chunkhash:8]-worker${env.PATH_VERSION}.min.js` : `[name]-worker${env.PATH_VERSION}.js`
      },
      plugins: [
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
