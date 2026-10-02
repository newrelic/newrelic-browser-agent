const { createClient, findDashboard, upsertDashboard, deleteDashboard, listQueries, validateQueries, VALIDATION_BATCH_SIZE, VALIDATION_WINDOW } = require('../../../../../tools/supportability-metrics/dashboard/client')

const environment = { graphqlUrl: 'https://example.test/graphql', oneUrl: 'https://one.example.test' }

/** A fake fetch that answers each request with the next response, and remembers the requests. */
function fakeFetch (...responses) {
  const calls = []
  const implementation = jest.fn(async (url, options) => {
    const body = JSON.parse(options.body)
    calls.push({ url, headers: options.headers, ...body })
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]
    const resolved = typeof next === 'function' ? next(body) : next
    return { ok: resolved.ok !== false, status: resolved.status || 200, statusText: resolved.statusText, json: async () => resolved.body || { data: resolved.data } }
  })
  return { implementation, calls }
}

const clientWith = (...responses) => {
  const fake = fakeFetch(...responses)
  return { client: createClient(environment, 'the-key', fake.implementation), calls: fake.calls }
}

describe('createClient', () => {
  test('posts the query and variables with the API key', async () => {
    const { client, calls } = clientWith({ data: { ok: true } })

    expect(await client.request('query { a }', { x: 1 })).toEqual({ ok: true })
    expect(calls[0]).toMatchObject({ url: 'https://example.test/graphql', query: 'query { a }', variables: { x: 1 } })
    expect(calls[0].headers['API-Key']).toBe('the-key')
  })

  test('throws with the GraphQL error messages', async () => {
    const { client } = clientWith({ body: { errors: [{ message: 'bad thing' }, { message: 'worse thing' }] } })

    await expect(client.request('q')).rejects.toThrow('NerdGraph error: bad thing; worse thing')
  })

  test('throws on an HTTP error', async () => {
    const { client } = clientWith({ ok: false, status: 403, statusText: 'Forbidden' })

    await expect(client.request('q')).rejects.toThrow('NerdGraph answered 403 Forbidden')
  })

  test('builds a dashboard link from the guid', () => {
    expect(clientWith({}).client.dashboardUrl('ABC')).toBe('https://one.example.test/dashboards/detail/ABC')
  })
})

describe('findDashboard', () => {
  test('searches by exact name, type and account, and escapes the name', async () => {
    const { client, calls } = clientWith({ data: { actor: { entitySearch: { results: { entities: [] } } } } })
    await findDashboard(client, { accountId: 432507, name: "[PR #5] it's" })

    expect(calls[0].variables.query).toBe("domain = 'VIZ' AND type = 'DASHBOARD' AND accountId = 432507 AND name = '[PR #5] it\\'s'")
  })

  test('returns the entity whose name matches exactly, ignoring near matches', async () => {
    const { client } = clientWith({ data: { actor: { entitySearch: { results: { entities: [{ guid: 'A', name: 'Other' }, { guid: 'B', name: 'Mine' }] } } } } })

    expect(await findDashboard(client, { accountId: 1, name: 'Mine' })).toEqual({ guid: 'B', name: 'Mine' })
  })
})

describe('upsertDashboard', () => {
  const dashboard = { name: 'Mine', pages: [], variables: [] }
  const noneFound = { data: { actor: { entitySearch: { results: { entities: [] } } } } }
  const oneFound = { data: { actor: { entitySearch: { results: { entities: [{ guid: 'EXISTING', name: 'Mine' }] } } } } }

  test('creates the dashboard in the account when there is none', async () => {
    const { client, calls } = clientWith(noneFound, { data: { dashboardCreate: { entityResult: { guid: 'NEW' }, errors: null } } })
    const result = await upsertDashboard(client, { accountId: 432507, dashboard })

    expect(result).toEqual({ guid: 'NEW', url: 'https://one.example.test/dashboards/detail/NEW', created: true })
    expect(calls[1].query).toContain('dashboardCreate')
    expect(calls[1].variables).toEqual({ accountId: 432507, dashboard })
  })

  test('replaces the dashboard with the same name when there is one', async () => {
    const { client, calls } = clientWith(oneFound, { data: { dashboardUpdate: { entityResult: { guid: 'EXISTING' }, errors: null } } })
    const result = await upsertDashboard(client, { accountId: 432507, dashboard })

    expect(result).toMatchObject({ guid: 'EXISTING', created: false })
    expect(calls[1].query).toContain('dashboardUpdate')
    expect(calls[1].variables).toEqual({ guid: 'EXISTING', dashboard })
  })

  test('throws with the description of an error New Relic returns', async () => {
    const { client } = clientWith(noneFound, { data: { dashboardCreate: { entityResult: null, errors: [{ description: 'Invalid widget', type: 'INVALID_INPUT' }] } } })

    await expect(upsertDashboard(client, { accountId: 1, dashboard })).rejects.toThrow('Could not create the dashboard "Mine": Invalid widget (INVALID_INPUT)')
  })
})

describe('deleteDashboard', () => {
  test('deletes the dashboard with that name', async () => {
    const { client, calls } = clientWith({ data: { actor: { entitySearch: { results: { entities: [{ guid: 'G', name: 'Mine' }] } } } } }, { data: { dashboardDelete: { status: 'SUCCESS', errors: null } } })

    expect(await deleteDashboard(client, { accountId: 1, name: 'Mine' })).toBe(true)
    expect(calls[1].variables).toEqual({ guid: 'G' })
  })

  test('does nothing, and says so, when there is no such dashboard', async () => {
    const { client, calls } = clientWith({ data: { actor: { entitySearch: { results: { entities: [] } } } } })

    expect(await deleteDashboard(client, { accountId: 1, name: 'Mine' })).toBe(false)
    expect(calls).toHaveLength(1)
  })
})

describe('validateQueries', () => {
  const widget = (query, accountId = 7) => ({ rawConfiguration: { nrqlQueries: [{ accountIds: [accountId], query }] } })
  const dashboard = (queries, variables = []) => ({ pages: [{ widgets: queries.map(query => widget(query)) }], variables })

  test('lists each distinct query once, with its account, including the variable queries', () => {
    const found = listQueries({ pages: [{ widgets: [widget('FROM A'), widget('FROM A'), widget('FROM B', 8)] }], variables: [{ nrqlQuery: { accountIds: [7], query: 'FROM V' } }] })

    expect(found).toEqual([{ account: 7, query: 'FROM A' }, { account: 8, query: 'FROM B' }, { account: 7, query: 'FROM V' }])
  })

  test('returns no failures when every query runs, and adds a short time range to those without one', async () => {
    const { client, calls } = clientWith({ data: {} })
    const failures = await validateQueries(client, dashboard(['FROM Supportability SELECT count(*)', 'FROM Supportability SELECT count(*) SINCE 7 days ago']))

    expect(failures).toEqual([])
    expect(Object.values(calls[0].variables).filter(value => typeof value === 'string')).toEqual([
      'FROM Supportability SELECT count(*) SINCE 3 hours ago',
      'FROM Supportability SELECT count(*) SINCE 7 days ago'
    ])
  })

  test('uses a time range longer than the 1 hour step of the charts, which New Relic rejects otherwise', async () => {
    const { client, calls } = clientWith({ data: {} })
    await validateQueries(client, dashboard(['FROM Supportability SELECT sum(call_count) TIMESERIES 1 hour']))

    expect(calls[0].variables.q0).toBe('FROM Supportability SELECT sum(call_count) TIMESERIES 1 hour ' + VALIDATION_WINDOW)
    expect(Number(VALIDATION_WINDOW.match(/SINCE (\d+) hours ago/)[1])).toBeGreaterThan(1)
  })

  test('replaces dashboard variables with a sample value so the query can run', async () => {
    const { client, calls } = clientWith({ data: {} })
    await validateQueries(client, dashboard(['FROM Supportability SELECT count(*) WHERE name LIKE {{metric}}']))

    expect(calls[0].variables.q0).toContain("WHERE name LIKE 'Browser/Supportability/Session/RaceCondition/Seen' " + VALIDATION_WINDOW)
  })

  test('sends queries in batches', async () => {
    const { client, calls } = clientWith({ data: {} })
    await validateQueries(client, dashboard(Array.from({ length: VALIDATION_BATCH_SIZE + 1 }, (_, i) => `FROM Supportability SELECT count(*) WHERE x = ${i}`)))

    expect(calls).toHaveLength(2)
  })

  test('says which query is invalid, by trying the batch\'s queries one at a time when the batch fails', async () => {
    const responses = (body) => {
      const text = JSON.stringify(body.variables)
      if (!body.variables.q && text.includes('BROKEN')) return { body: { errors: [{ message: 'batch failed' }] } } // the batch
      if (body.variables.q?.includes('BROKEN')) return { body: { errors: [{ message: 'NRQL Syntax Error' }] } }
      return { data: {} }
    }
    const { client } = clientWith(responses)
    const failures = await validateQueries(client, dashboard(['FROM Supportability SELECT count(*)', 'FROM Supportability BROKEN']))

    expect(failures).toEqual([{ query: 'FROM Supportability BROKEN', error: 'NerdGraph error: NRQL Syntax Error' }])
  })
})
