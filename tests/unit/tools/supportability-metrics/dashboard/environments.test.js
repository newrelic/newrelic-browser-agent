const { ENVIRONMENTS } = require('../../../../../tools/supportability-metrics/dashboard/environments')

describe('ENVIRONMENTS', () => {
  test('staging reads account 432507 on the staging stack and keeps its dashboard in account 550352', () => {
    expect(ENVIRONMENTS.staging).toMatchObject({ dataAccountId: 432507, dashboardAccountId: 550352, graphqlUrl: 'https://staging-api.newrelic.com/graphql', apiKeyVariable: 'NR_API_KEY_STAGING' })
  })

  test('us prod reads account 33 and keeps its dashboard in account 1672072', () => {
    expect(ENVIRONMENTS['us-prod']).toMatchObject({ dataAccountId: 33, dashboardAccountId: 1672072, graphqlUrl: 'https://api.newrelic.com/graphql', apiKeyVariable: 'NR_API_KEY_PRODUCTION' })
  })

  test('has only the environments that are supported', () => {
    expect(Object.keys(ENVIRONMENTS)).toEqual(['staging', 'us-prod'])
  })

  test('gives every environment both accounts, a stack, a site to link to, and a key variable', () => {
    Object.values(ENVIRONMENTS).forEach(environment => {
      expect(Number.isInteger(environment.dataAccountId)).toBe(true)
      expect(Number.isInteger(environment.dashboardAccountId)).toBe(true)
      expect(environment.graphqlUrl).toMatch(/^https:\/\/.+\/graphql$/)
      expect(environment.oneUrl).toMatch(/^https:\/\//)
      expect(environment.apiKeyVariable).toMatch(/^NR_API_KEY_/)
    })
  })
})
