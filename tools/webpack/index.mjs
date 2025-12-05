import path from 'path'
import url from 'url'
import fs from 'fs-extra'
import setBuildEnvironment from './env.mjs'
import standardConfig from './configs/standard.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

/**
 * @typedef {object} WebpackBuildOptions
 * @property {string} [mode] Indicates which mode to run the webpack
 * build in. This is not the same as the --mode CLI option.
 * @property {string} [branchName] Name of the branch being built
 * and that should be included in the version string.
 * @property {string} [pathVersion] Override the default PATH_VERSION
 * build variable set according to the build mode.
 * @property {string} [subversion] Override the default SUBVERSION
 * build variable set according to the build mode.
 * @property {string} [publicPath] Override the default PUBLIC_PATH
 * build variable set according to the build mode.
 * @property {string} [version] Override the default VERSION
 * build variable set according to the build mode.
 * @property {string} PATH_VERSION Calculated path version value
 * for the current webpack build.
 * @property {string} SUBVERSION Calculated subversion value
 * for the current webpack build.
 * @property {string} PUBLIC_PATH Calculated public path value
 * for the current webpack build.
 * @property {string} VERSION Calculated version value
 * for the current webpack build.
 * @property {object} paths Calculated absolute path values to be
 * used throughout the build configurations.
 * @property {string} paths.root Calculated absolute path to the project
 * root.
 * @property {string} paths.src Calculated absolute path to the project
 * source code directory.
 * @property {string} paths.root Calculated absolute path to the project
 * directory where webpack will output it's built files.
 */

/**
 * Generates the necessary configs for webpack to build the agent.
 * @param {WebpackBuildOptions} env Build variables passed into the webpack cli
 * using --env foo=bar --env biz=baz
 * @param {object} param1 Webpack cli options
 * @param {string} param1.mode The mode options passed to webpack
 * using --mode production
 */
export default async (env) => {
  env.paths = {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '../../src'),
    build: path.resolve(__dirname, '../../build')
  }

  setBuildEnvironment(env)
  await fs.emptyDir(env.paths.build)

  return [
    ...standardConfig(env)
  ]
}
