/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file This file exposes CDN build environment variables. These variables will
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
export const BUILD_ENV = process.env.BUILD_ENV

/**
 * Exposes the distribution method of the agent
 */
export const DIST_METHOD = 'CDN'

export const RRWEB_PACKAGE_NAME = '@newrelic/rrweb'
// Babel will inline this with the rrweb (fork) version on CDN builds.
export const RRWEB_VERSION = process.env.RRWEB_VERSION
