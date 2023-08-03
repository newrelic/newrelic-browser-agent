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
    target: 'web',
    entry: {
      'nr-loader-rum': path.join(env.paths.src, 'cdn/lite.js'),
      'nr-loader-rum.min': path.join(env.paths.src, 'cdn/lite.js'),
      'nr-loader-full': path.join(env.paths.src, 'cdn/pro.js'),
      'nr-loader-full.min': path.join(env.paths.src, 'cdn/pro.js'),
      'nr-loader-spa': path.join(env.paths.src, 'cdn/spa.js'),
      'nr-loader-spa.min': path.join(env.paths.src, 'cdn/spa.js'),
      ...(env.SUBVERSION !== 'PROD' && { 'nr-loader-experimental': path.resolve(env.paths.src, 'cdn/experimental.js') }),
      ...(env.SUBVERSION !== 'PROD' && { 'nr-loader-experimental.min': path.resolve(env.paths.src, 'cdn/experimental.js') })
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: (env.coverage || 'false').toLowerCase() === 'true'
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
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        defaultSizes: 'stat',
        reportFilename: `standard${env.PATH_VERSION}.stats.html`
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: 'json',
        openAnalyzer: false,
        defaultSizes: 'stat',
        reportFilename: `standard${env.PATH_VERSION}.stats.json`
      })
    ]
  })
}
