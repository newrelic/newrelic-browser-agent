import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import NRBAPrependSemicolonPlugin from '../plugins/prepend-semicolon.mjs'
import NRBARemoveNonAsciiPlugin from '../plugins/remove-non-ascii.mjs'
import NRBASubresourceIntegrityPlugin from '../plugins/sri-plugin.mjs'
import NRBALoaderApmCheckPlugin from '../plugins/loader-apm-check.mjs'
import NRBAFuzzyLoadersPlugin from '../plugins/fuzzy-loaders.mjs'
import { webpackCacheGroup } from '../../bundler-tools/bundler-tools.mjs'

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
    mode: env.SUBVERSION === 'LOCAL' ? 'development' : 'production',
    optimization: {
      realContentHash: true,
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
          default: false,
          ...webpackCacheGroup(asyncChunkName, (module, { chunkGraph }) => chunkGraph.getModuleChunks(module).filter(chunk => !['recorder', 'compressor'].includes(chunk.name)).length > 0),
          ...webpackCacheGroup(asyncChunkName + '-recorder', (module, { chunkGraph }) => chunkGraph.getModuleChunks(module).filter(chunk => !['recorder'].includes(chunk.name)).length === 0),
          ...webpackCacheGroup(asyncChunkName + '-compressor', (module, { chunkGraph }) => chunkGraph.getModuleChunks(module).filter(chunk => !['compressor'].includes(chunk.name)).length === 0)
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
      chunkFilename: `[name]${env.PATH_VERSION}.min.js`,
      path: env.paths.build,
      publicPath: env.PUBLIC_PATH,
      clean: false,
      chunkLoadingGlobal: `webpackChunk:NRBA-${env.VERSION}.${env.SUBVERSION}`,
      uniqueName: `NRBA-${env.VERSION}.${env.SUBVERSION}`,
      crossOriginLoading: 'anonymous'
    },
    plugins: [
      new webpack.SourceMapDevToolPlugin({
        namespace: `NRBA-${env.VERSION}.${env.SUBVERSION}`,
        filename: '[file].map[query]',
        moduleFilenameTemplate: 'nr-browser-agent://[namespace]/[resource-path]?[loaders]',
        publicPath: env.PUBLIC_PATH,
        append: env.SUBVERSION === 'PROD' ? false : '//# sourceMappingURL=[url]'
      }),
      new NRBAPrependSemicolonPlugin(),
      new NRBARemoveNonAsciiPlugin(),
      new NRBALoaderApmCheckPlugin(),
      new NRBASubresourceIntegrityPlugin(),
      new NRBAFuzzyLoadersPlugin(),
      new webpack.NormalModuleReplacementPlugin(/(?:[\\/]constants)?[\\/]env/, (resource) => {
        resource.request = resource.request.replace(/env$/, 'env.cdn')
      }),
      new webpack.NormalModuleReplacementPlugin(/(?:[\\/]configure)?[\\/]public-path/, (resource) => {
        resource.request = resource.request.replace(/public-path$/, 'public-path.cdn')
      }),
      new webpack.NormalModuleReplacementPlugin(/(?:[\\/]configure)?[\\/]nonce/, (resource) => {
        resource.request = resource.request.replace(/nonce$/, 'nonce.cdn')
      })
    ]
  }
}
