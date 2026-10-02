/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef {Object} DashboardEnvironment
 * @property {string} label A short name used in dashboard text.
 * @property {string} graphqlUrl The NerdGraph endpoint of the New Relic stack this environment lives on.
 * @property {string} oneUrl The New Relic One site of that stack, used to build a link to a dashboard from its guid.
 * @property {number} dataAccountId The account that holds the `Supportability` events Angler writes. Every query in the dashboard reads this account.
 * @property {number} dashboardAccountId The account the dashboard itself is created in. It can differ from the data account, because each widget
 *   names the account it queries. Viewers need read access to the data account, and the API key needs write access to this one.
 * @property {string} apiKeyVariable The name of the environment variable that holds a user API key with dashboard write access.
 */

/**
 * Where the generated supportability dashboard lives. The GitHub secrets behind the key variables are `NR_API_KEY_STAGING` and
 * `NR_API_KEY_PRODUCTION`. EU and JP are not supported yet.
 * @type {Object<string, DashboardEnvironment>}
 */
const ENVIRONMENTS = {
  staging: {
    label: 'staging',
    graphqlUrl: 'https://staging-api.newrelic.com/graphql',
    oneUrl: 'https://staging-one.newrelic.com',
    dataAccountId: 432507,
    dashboardAccountId: 550352,
    apiKeyVariable: 'NR_API_KEY_STAGING'
  },
  'us-prod': {
    label: 'us prod',
    graphqlUrl: 'https://api.newrelic.com/graphql',
    oneUrl: 'https://one.newrelic.com',
    dataAccountId: 33,
    dashboardAccountId: 1672072,
    apiKeyVariable: 'NR_API_KEY_PRODUCTION'
  }
}

module.exports = { ENVIRONMENTS }
