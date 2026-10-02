const { run, parseArguments, DEFAULT_NAME, previewName } = require('../../../../../tools/supportability-metrics/dashboard/apply')

const registry = {
  header: 'h',
  sections: [{ id: 's', title: 'Section' }],
  entries: [{ section: 's', tag: 'Some/Metric/Seen', description: 'd' }]
}

/** A fake NerdGraph that creates and deletes dashboards in memory. */
function fakeNerdGraph ({ existing = [], invalidQueryText } = {}) {
  const dashboards = [...existing]
  const requests = []
  const implementation = async (url, options) => {
    const { query, variables } = JSON.parse(options.body)
    requests.push({ url, headers: options.headers, query, variables })
    const respond = (data) => ({ ok: true, status: 200, json: async () => ({ data }) })
    if (query.includes('entitySearch')) return respond({ actor: { entitySearch: { results: { entities: dashboards.filter(d => variables.query.includes(`name = '${d.name}'`)) } } } })
    if (query.includes('dashboardCreate')) { dashboards.push({ guid: 'NEW-GUID', name: variables.dashboard.name }); return respond({ dashboardCreate: { entityResult: { guid: 'NEW-GUID' }, errors: null } }) }
    if (query.includes('dashboardUpdate')) return respond({ dashboardUpdate: { entityResult: { guid: variables.guid }, errors: null } })
    if (query.includes('dashboardDelete')) { dashboards.splice(dashboards.findIndex(d => d.guid === variables.guid), 1); return respond({ dashboardDelete: { status: 'SUCCESS', errors: null } }) }
    if (query.includes('nrql')) {
      const texts = Object.entries(variables).filter(([key]) => key.startsWith('q')).map(([, value]) => value)
      if (invalidQueryText && texts.some(text => text.includes(invalidQueryText))) return { ok: true, status: 200, json: async () => ({ errors: [{ message: 'NRQL Syntax Error' }] }) }
      return respond({})
    }
    throw new Error('unexpected request ' + query)
  }
  return { implementation, requests, dashboards }
}

/** @returns {number[]} The distinct accounts the dashboard's queries and variables read. */
const queryAccounts = (dashboard) => [...new Set([
  ...dashboard.pages.flatMap(page => page.widgets.flatMap(widget => (widget.rawConfiguration.nrqlQueries || []).flatMap(query => query.accountIds))),
  ...dashboard.variables.flatMap(variable => variable.nrqlQuery?.accountIds || [])
])]

const dependencies = (overrides = {}) => ({ env: { NR_API_KEY_STAGING: 'staging-key', NR_API_KEY_PRODUCTION: 'prod-key' }, registry, log: jest.fn(), ...overrides })

describe('parseArguments', () => {
  test('reads the flags, and defaults the name', () => {
    expect(parseArguments(['--env', 'staging', '--validate', '--write-json', 'out.json'])).toEqual({ env: 'staging', name: DEFAULT_NAME, validate: true, dryRun: false, remove: false, writeJson: 'out.json' })
    expect(parseArguments(['--env', 'us-prod', '--name', 'Mine', '--dry-run', '--delete'])).toMatchObject({ name: 'Mine', dryRun: true, remove: true })
  })
})

describe('loading in CI', () => {
  test('the dashboard tools do not load the JavaScript parser, because the jobs that run them use plain node with nothing installed', () => {
    jest.isolateModules(() => {
      jest.doMock('acorn', () => { throw new Error('acorn must not be loaded by the dashboard tools') })
      jest.doMock('acorn-walk', () => { throw new Error('acorn-walk must not be loaded by the dashboard tools') })

      expect(() => require('../../../../../tools/supportability-metrics/dashboard/apply')).not.toThrow()
    })
  })
})

describe('--pr', () => {
  test('names the dashboard as the preview for that pull request, in one place for creating and deleting', () => {
    expect(previewName(1885)).toBe('[PR #1885] Browser Agent Supportability Metrics (preview)')
    expect(parseArguments(['--env', 'staging', '--pr', '1885']).name).toBe(previewName(1885))
    expect(parseArguments(['--env', 'staging', '--pr', '1885', '--delete']).name).toBe(previewName(1885))
  })
})

describe('run', () => {
  test('rejects an environment it does not know', async () => {
    await expect(run({ ...parseArguments(['--env', 'eu-prod']) }, dependencies())).rejects.toThrow('Unknown --env "eu-prod". Use one of: staging, us-prod.')
  })

  test('needs the API key for a real run, naming the variable', async () => {
    await expect(run(parseArguments(['--env', 'staging']), dependencies({ env: {} }))).rejects.toThrow('NR_API_KEY_STAGING environment variable is not set')
    await expect(run(parseArguments(['--env', 'us-prod']), dependencies({ env: {} }))).rejects.toThrow('NR_API_KEY_PRODUCTION environment variable is not set')
  })

  test('a dry run needs no key and makes no request, but can save the dashboard as JSON', async () => {
    const fake = fakeNerdGraph()
    const writeFile = jest.fn()
    const result = await run(parseArguments(['--env', 'staging', '--dry-run', '--write-json', 'out.json']), dependencies({ env: {}, fetchImplementation: fake.implementation, writeFile }))

    expect(result).toEqual({ action: 'dry run' })
    expect(fake.requests).toHaveLength(0)
    expect(JSON.parse(writeFile.mock.calls[0][1]).name).toBe(DEFAULT_NAME)
  })

  test('creates the dashboard in the staging account on the staging stack, using the staging key', async () => {
    const fake = fakeNerdGraph()
    const result = await run(parseArguments(['--env', 'staging', '--name', '[PR #1] Preview']), dependencies({ fetchImplementation: fake.implementation }))
    const create = fake.requests.find(request => request.query.includes('dashboardCreate'))

    expect(result).toEqual({ url: 'https://staging-one.newrelic.com/dashboards/detail/NEW-GUID', action: 'created' })
    expect(create.url).toBe('https://staging-api.newrelic.com/graphql')
    expect(create.headers['API-Key']).toBe('staging-key')
    expect(create.variables.accountId).toBe(550352) // the dashboard lives here...
    expect(create.variables.dashboard.name).toBe('[PR #1] Preview')
    expect(queryAccounts(create.variables.dashboard)).toEqual([432507]) // ...but every query reads the data account
  })

  test('uses the production account, stack and key for us-prod', async () => {
    const fake = fakeNerdGraph()
    await run(parseArguments(['--env', 'us-prod']), dependencies({ fetchImplementation: fake.implementation }))
    const create = fake.requests.find(request => request.query.includes('dashboardCreate'))

    expect(create.url).toBe('https://api.newrelic.com/graphql')
    expect(create.headers['API-Key']).toBe('prod-key')
    expect(create.variables.accountId).toBe(1672072)
    expect(queryAccounts(create.variables.dashboard)).toEqual([33])
  })

  test('updates the dashboard instead of creating a second one when it already exists', async () => {
    const fake = fakeNerdGraph({ existing: [{ guid: 'OLD', name: DEFAULT_NAME }] })
    const result = await run(parseArguments(['--env', 'staging']), dependencies({ fetchImplementation: fake.implementation }))

    expect(result).toMatchObject({ action: 'updated', url: 'https://staging-one.newrelic.com/dashboards/detail/OLD' })
    expect(fake.requests.some(request => request.query.includes('dashboardCreate'))).toBe(false)
  })

  test('with --validate, runs the queries first and applies the dashboard when they are valid', async () => {
    const fake = fakeNerdGraph()
    const result = await run(parseArguments(['--env', 'staging', '--validate']), dependencies({ fetchImplementation: fake.implementation }))

    expect(result.action).toBe('created')
    expect(fake.requests.findIndex(request => request.query.includes('nrql'))).toBeLessThan(fake.requests.findIndex(request => request.query.includes('dashboardCreate')))
  })

  test('with --validate, applies nothing and says which query is invalid when one fails', async () => {
    const fake = fakeNerdGraph({ invalidQueryText: 'Some/Metric/Seen' })
    const log = jest.fn()

    await expect(run(parseArguments(['--env', 'staging', '--validate']), dependencies({ fetchImplementation: fake.implementation, log }))).rejects.toThrow('not valid NRQL, so the dashboard was not applied')
    expect(fake.requests.some(request => request.query.includes('dashboardCreate'))).toBe(false)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('INVALID: NerdGraph error: NRQL Syntax Error'))
  })

  test('searches for the dashboard to update or delete in the account it lives in, not the data account', async () => {
    const fake = fakeNerdGraph()
    await run(parseArguments(['--env', 'us-prod']), dependencies({ fetchImplementation: fake.implementation }))
    await run(parseArguments(['--env', 'staging', '--delete']), dependencies({ fetchImplementation: fake.implementation }))
    const searches = fake.requests.filter(request => request.query.includes('entitySearch')).map(request => request.variables.query)

    expect(searches[0]).toContain('accountId = 1672072')
    expect(searches[1]).toContain('accountId = 550352')
  })

  test('validates the queries against the data account', async () => {
    const fake = fakeNerdGraph()
    await run(parseArguments(['--env', 'staging', '--validate']), dependencies({ fetchImplementation: fake.implementation }))

    expect(new Set(fake.requests.filter(request => request.query.includes('nrql')).map(request => request.variables.account))).toEqual(new Set([432507]))
  })

  test('with --delete, removes the dashboard with that name', async () => {
    const fake = fakeNerdGraph({ existing: [{ guid: 'PR', name: '[PR #1] Preview' }] })
    const result = await run(parseArguments(['--env', 'staging', '--name', '[PR #1] Preview', '--delete']), dependencies({ fetchImplementation: fake.implementation }))

    expect(result.action).toBe('deleted')
    expect(fake.dashboards).toHaveLength(0)
  })

  test('with --delete, succeeds quietly when the dashboard is already gone', async () => {
    const result = await run(parseArguments(['--env', 'staging', '--delete']), dependencies({ fetchImplementation: fakeNerdGraph().implementation }))

    expect(result.action).toBe('nothing to delete')
  })
})
