/**
 * @file Provides Babel configuration for CommonJS NPM package output.
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
const plugins = [babelEnv()]

module.exports = { presets, plugins }
