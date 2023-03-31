/**
 * @file Provides Babel configuration for compiling src/index.js into NPM package output (ES modules).
 */

const babelEnv = require('./babel-env-vars')

const presets = [
  [
    '@babel/preset-env',
    {
      modules: false,
      targets: {
        browsers: [
          'last 10 Chrome versions',
          'last 10 Safari versions',
          'last 10 Firefox versions',
          'last 10 Edge versions',
          'last 10 ChromeAndroid versions',
          'last 10 iOS versions'
        ]
      }
    }
  ]
]
const plugins = [babelEnv({ source: 'PACKAGE', subversion: 'NPM', distMethod: 'NPM' })]

module.exports = { presets, plugins }
