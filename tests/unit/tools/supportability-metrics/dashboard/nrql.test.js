const { LABEL, quote, namesOf, nameCondition, queries } = require('../../../../../tools/supportability-metrics/dashboard/nrql')

const single = { tag: 'Session/RaceCondition/Seen', section: 's', description: 'd' }
const other = { tag: 'Ajax/Events/Excluded/App', section: 's', description: 'd' }
const family = { tag: 'API/<name>/called', section: 's', description: 'd', values: ['log', 'measure'] }
const open = { tag: 'Config/<init path>/Enabled', section: 's', description: 'd' }
const abort = { tag: 'SessionReplay/Abort/<reason>', section: 's', description: 'd', values: ['Reset', 'Too-Big'], value: { unit: 'bytes', for: ['Too-Big'] } }

describe('quote', () => {
  test('wraps in single quotes and escapes quotes and backslashes', () => {
    expect(quote("it's")).toBe("'it\\'s'")
    expect(quote('a\\b')).toBe("'a\\\\b'")
  })
})

describe('LABEL', () => {
  test('strips exactly the Browser/Supportability/ prefix, the offset the hand-built dashboard uses', () => {
    expect(LABEL).toBe('substring(name, 23)')
  })
})

describe('namesOf', () => {
  test('is the full name for a single metric', () => {
    expect(namesOf(single)).toEqual(['Browser/Supportability/Session/RaceCondition/Seen'])
  })

  test('expands a family, optionally to a subset of its values', () => {
    expect(namesOf(family)).toEqual(['Browser/Supportability/API/log/called', 'Browser/Supportability/API/measure/called'])
    expect(namesOf(abort, ['Too-Big'])).toEqual(['Browser/Supportability/SessionReplay/Abort/Too-Big'])
  })
})

describe('nameCondition', () => {
  test('is an equality for one metric', () => {
    expect(nameCondition([single])).toBe("name = 'Browser/Supportability/Session/RaceCondition/Seen'")
  })

  test('is an IN list for several single metrics', () => {
    expect(nameCondition([single, other])).toBe("name IN ('Browser/Supportability/Session/RaceCondition/Seen', 'Browser/Supportability/Ajax/Events/Excluded/App')")
  })

  test('matches a family with a LIKE pattern, so a new value is picked up without regenerating', () => {
    expect(nameCondition([family])).toBe("name LIKE 'Browser/Supportability/API/%/called'")
    expect(nameCondition([open])).toBe("name LIKE 'Browser/Supportability/Config/%/Enabled'")
  })

  test('combines exact names and patterns with OR, in parentheses', () => {
    expect(nameCondition([single, family])).toBe("(name = 'Browser/Supportability/Session/RaceCondition/Seen' OR name LIKE 'Browser/Supportability/API/%/called')")
  })

  test('matches exact names for the values of a family that are restricted', () => {
    expect(nameCondition([abort], { only: { 'SessionReplay/Abort/<reason>': ['Too-Big'] } })).toBe("name = 'Browser/Supportability/SessionReplay/Abort/Too-Big'")
  })
})

describe('queries', () => {
  const condition = "name = 'x'"

  test('the count is the sum of call_count over time, one line per metric', () => {
    expect(queries.countByMetric(condition)).toBe(`FROM Supportability SELECT sum(call_count) WHERE name = 'x' FACET ${LABEL} TIMESERIES 1 hour LIMIT 20`)
  })

  test('the average is the sum of the values over the sum of the counts, as the dashboard documentation says', () => {
    expect(queries.averageValue(condition, 'ms')).toContain("sum(total_call_time) / sum(call_count) AS 'Average (ms)'")
  })

  test('the maximum and minimum are taken across events, because they are not aggregated within one', () => {
    expect(queries.maximumValue(condition, 'ms')).toContain('max(max_call_time)')
    expect(queries.minimumValue(condition, 'ms')).toContain('min(min_call_time)')
  })

  test('value queries can be left unfaceted, for a single metric', () => {
    expect(queries.averageValue(condition, 'ms', false)).not.toContain('FACET')
    expect(queries.averageValue(condition, 'ms')).toContain('FACET')
  })

  test('breaks a selection down by metric: accounts, apps and a table', () => {
    expect(queries.accountsByMetric(condition)).toBe(`FROM Supportability SELECT uniqueCount(account_id) AS 'Accounts' WHERE name = 'x' FACET ${LABEL} LIMIT MAX`)
    expect(queries.appsByMetric(condition)).toContain('uniqueCount(agent_id)')
    expect(queries.tableByMetric(condition)).toContain('sum(call_count) AS \'Calls\', uniqueCount(account_id) AS \'Accounts\', uniqueCount(agent_id) AS \'Apps\'')
  })

  test('breaks the count down by account and by app', () => {
    expect(queries.countByAccount(condition)).toContain('FACET account_id TIMESERIES 1 hour LIMIT 10')
    expect(queries.countByApp(condition)).toContain('FACET agent_id TIMESERIES 1 hour LIMIT 10')
  })

  test('counts accounts and apps that reported', () => {
    expect(queries.accountsReporting(condition)).toContain('uniqueCount(account_id)')
    expect(queries.appsReporting(condition)).toContain('uniqueCount(agent_id)')
  })

  test('lists the full metric names from the data for the explorer picker', () => {
    expect(queries.metricNames()).toBe("FROM Supportability SELECT uniques(name) WHERE name LIKE 'Browser/Supportability/%' SINCE 7 days ago LIMIT MAX")
  })
})
