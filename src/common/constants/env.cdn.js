/**
 * @file This file exposes CDN build environment variables. These variables will
 * be overridden with babel.
 */

/**
 * Exposes the version of the agent
 */
export const VERSION = typeof process.env.BUILD_VERSION !== 'undefined' && process.env.BUILD_VERSION || ''

/**
 * Exposes the build type of the agent
 * Valid values are LOCAL, PROD, DEV
 */
export const BUILD_ENV = typeof process.env.BUILD_ENV !== 'undefined' && process.env.BUILD_ENV || ''

/**
 * Exposes the distribution method of the agent
 */
export const DIST_METHOD = 'CDN'
