/**
 * @file Provides Babel configuration for compiling src/index.js into NPM package output (ES modules).
 */

const babelEnv = require('./babel-env-vars')

const presets = []
const plugins = [babelEnv()]

module.exports = { presets, plugins }
