/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const env = process.env.NEWRELIC_ENVIRONMENT || 'default'

const defaultConfig = {
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  custom_insights_events: {
    enabled: true,
    max_samples_stored: 5000
  },
  rules: {
    name: [
      { pattern: /^\/1\/.*$/, name: 'rum' },
      { pattern: /^\/events\/1\/.*$/, name: 'events' },
      { pattern: /^\/jserrors\/1\/.*$/, name: 'jserrors' },
      { pattern: /^\/ins\/1\/.*$/, name: 'ins' },
      { pattern: /^\/resources\/1\/.*$/, name: 'resources' },
      { pattern: /^\/tests\/browser\/.*$/, name: 'browser-test' }
    ]
  }
}

const envConfigs = {
  default: {
    agent_enabled: false
  },
  staging: {
    agent_enabled: true,
    app_name: ['jil-staging'],
    license_key: process.env.JIL_NODE_NEW_RELIC_LICENSE_KEY,
    host: 'staging-collector.newrelic.com'
  },
  ci: {
    agent_enabled: true,
    app_name: ['jil']
  }
}

exports.config = Object.assign(defaultConfig, envConfigs[env])
