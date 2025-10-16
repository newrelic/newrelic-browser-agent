/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Centralized rrweb-related constants so they can be consumed and re-exported by env files
 * without duplicating the string literal in multiple places.
 */
export const RRWEB_PACKAGE_NAME = '@newrelic/rrweb'
// RRWEB_VERSION is provided at build time via babel inline env plugin; fallback provided for non-transpiled contexts
// At build time Babel inlines process.env.RRWEB_VERSION; in non-transpiled or test contexts
// (or if the env var was not injected) we fall back to '0.0.0'. We intentionally avoid
// importing this repo's package.json or the rrweb package's package.json here to keep
// the distributed ESM free of deep relative path resolution that might fail in consumer
// bundlers. The actual version is sourced centrally in babel.config.js so both CDN and
// NPM builds receive the installed package's concrete version string.
export const RRWEB_VERSION = (typeof process !== 'undefined' && process.env && process.env.RRWEB_VERSION) || '0.0.0'
