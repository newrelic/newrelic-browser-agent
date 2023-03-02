/**
 * @file Provides Babel configuration for ES modules NPM package output.
 */

const babelEnv = require('./babel-env-vars')

const presets = []
const plugins = [babelEnv()]

module.exports = { presets, plugins }
