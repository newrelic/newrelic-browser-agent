const path = require('path')
const webpack = require('webpack')
const { globSync } = require('glob')
const TerserPlugin = require('terser-webpack-plugin')

function getDirectories (src, callback) {
  return globSync(src + '/**/*', callback).filter(x => x.endsWith('.browser.js'))
};
const filePaths = getDirectories(path.join(__dirname, process.env.file || '../../../tests/browser'))

const entry = {}

filePaths.every(p => {
  const name = '/tests' + p.split('/tests').pop().replace('.js', '')
  entry[name] = p
  return true
})

console.log(`building ${filePaths.length} browser test files`)

module.exports = {
  cache: false,
  entry,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../../../tests/assets/scripts'),
    clean: false,
    publicPath: 'scripts/' // CDN route vs local route (for linking chunked assets)
  },
  mode: 'production',
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
  target: 'browserslist:ie >= 11',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env', {
                  useBuiltIns: 'entry',
                  corejs: { version: 3.23, proposals: true },
                  loose: true,
                  targets: {
                    browsers: [
                      'ie >= 11' // Does not affect webpack's own runtime output; see `target` webpack config property.
                    ]
                  }
                }
              ]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify')
    },
    extensions: ['.js']
  },
  plugins: [
    // fix "process is not defined" error:
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 2000000,
    maxAssetSize: 2000000
  }
}
