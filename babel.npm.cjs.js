/**
 * @file Provides Babel configuration for compiling src/index.js into NPM package output (CommonJS).
 */

const babelEnv = require('./babel-env-vars')

const presets = [
  [
    '@babel/preset-env',
    {
      targets: {
        node: true
      }
    }
  ]
]
const plugins = [babelEnv({ source: 'PACKAGE', subversion: 'NPM' })]

module.exports = { presets, plugins }
