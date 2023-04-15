/**
 * @file This file exposes NPM build environment variables. These variables will
 * be overridden with babel.
 */

/**
 * Exposes the version of the agent
 */
export const VERSION = process.env.BUILD_VERSION

/**
 * Exposes the build type of the agent
 * Valid values are LOCAL, PROD, DEV
 */
export const BUILD_ENV = 'NPM'

/**
 * Exposes the distribution method of the agent
 * Valid valuse are CDN, NPM
 */
export const DIST_METHOD = 'NPM'
