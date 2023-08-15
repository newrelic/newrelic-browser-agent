import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import NRBAChunkingPlugin from '../plugins/nrba-chunking/index.mjs'

/**
 * @typedef {import('../index.mjs').WebpackBuildOptions} WebpackBuildOptions
 */

/**
 * Returns a webpack configuration that is shared by all agent webpack
 * builds.
 * @param {WebpackBuildOptions} env Build variables passed into the webpack cli
 * using --env foo=bar --env biz=baz
 * @param {string} asyncChunkName Partial name to use for the loader's async chunk
 */
export default (env, asyncChunkName) => {
  return {
    devtool: false,
    mode: env.SUBVERSION === 'PROD' ? 'production' : 'development',
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({
        include: [/\.min\.js$/, /^(?:[0-9])/],
        terserOptions: {
          mangle: {
            keep_fnames: /nrWrapper/,
            // Prevent terser from creating mangled variables names of just dollar symbols
            reserved: ['$', '$$', '$$$', '$$$$']
          }
        }
      })],
      flagIncludedChunks: true,
      mergeDuplicateChunks: true,
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          defaultVendors: false,
          default: false
        }
      }
    },
    output: {
      filename: (pathData) => {
        if (pathData.chunk.name.indexOf('.min') > -1) {
          return env.SUBVERSION === 'PROD' ? `${pathData.chunk.name.replace('.min', '')}${env.PATH_VERSION}.min.js` : '[name].js'
        }

        return env.SUBVERSION === 'PROD' ? `[name]${env.PATH_VERSION}.js` : '[name].js'
      },
      chunkFilename: env.SUBVERSION === 'PROD' ? `[name].[chunkhash:8]${env.PATH_VERSION}.min.js` : `[name]${env.PATH_VERSION}.js`,
      path: env.paths.build,
      publicPath: env.PUBLIC_PATH,
      clean: false,
      chunkLoadingGlobal: `webpackChunk:NRBA-${env.VERSION}.${env.SUBVERSION}`,
      uniqueName: `NRBA-${env.VERSION}.${env.SUBVERSION}`
    },
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        namespace: `NRBA-${env.VERSION}.${env.SUBVERSION}`,
        filename: '[file].map[query]',
        moduleFilenameTemplate: 'nr-browser-agent://[namespace]/[resource-path]?[loaders]',
        publicPath: env.PUBLIC_PATH
      }),
      new NRBAChunkingPlugin({
        asyncChunkName
      })
    ]
  }
}
