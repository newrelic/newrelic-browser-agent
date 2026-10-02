const { buildDashboard, Grid, METRIC_VARIABLE } = require('../../../../../tools/supportability-metrics/dashboard/generate')
const registry = require('../../../../../tools/supportability-metrics/registry')

const build = (reg = registry, options = {}) => buildDashboard(reg, { dataAccountId: 432507, name: 'Test dashboard', ...options })
const widgetsOf = (dashboard) => dashboard.pages.flatMap(page => page.widgets)
const queriesOf = (dashboard) => widgetsOf(dashboard).flatMap(widget => widget.rawConfiguration.nrqlQueries || []).map(query => query.query)
const page = (dashboard, name) => dashboard.pages.find(candidate => candidate.name === name)

const small = {
  header: 'h',
  sections: [{ id: 'plain', title: 'Plain' }, { id: 'valued', title: 'Valued' }, { id: 'empty', title: 'Empty' }],
  entries: [
    { section: 'plain', tag: 'Plain/One/Seen', description: 'd' },
    { section: 'plain', tag: 'Plain/Two/Seen', description: 'd' },
    { section: 'valued', tag: 'Valued/Size', description: 'd', value: { unit: 'bytes' } },
    { section: 'valued', tag: 'Valued/Time/<kind>', description: 'd', values: ['a', 'b'], value: { unit: 'ms', for: ['a'] } }
  ]
}

describe('buildDashboard', () => {
  test('is named and described as generated', () => {
    const dashboard = build(small, { name: 'My name' })

    expect(dashboard.name).toBe('My name')
    expect(dashboard.description).toContain('Generated')
    expect(dashboard.description).toContain('overwritten')
  })

  test('is editable by anyone with access, so that whoever created it, or a later key, can be replaced by another user without being locked out', () => {
    expect(build(small).permissions).toBe('PUBLIC_READ_WRITE')
  })

  test('has the metric explorer first, then a page for each section that has entries, in alphabetical order', () => {
    expect(build(small).pages.map(candidate => candidate.name)).toEqual(['Metric Explorer', 'Plain', 'Valued'])
  })

  test('keeps the explorer first even though it would not sort first, because the dashboard opens on its first page', () => {
    const names = build({ ...small, sections: [{ id: 'plain', title: 'Alpha' }, { id: 'valued', title: 'Zulu' }] }).pages.map(candidate => candidate.name)

    expect(names).toEqual(['Metric Explorer', 'Alpha', 'Zulu'])
  })

  test('sorts the section pages without regard to case', () => {
    const names = build({ ...small, sections: [{ id: 'plain', title: 'banana' }, { id: 'valued', title: 'Apple' }] }).pages.map(candidate => candidate.name)

    expect(names).toEqual(['Metric Explorer', 'Apple', 'banana'])
  })

  test('has no overview page', () => {
    expect(build().pages.map(candidate => candidate.name)).not.toContain('Overview')
  })

  test('has a page for every section of the real registry that has entries', () => {
    const dashboard = build()
    const titles = registry.sections.filter(section => registry.entries.some(entry => entry.section === section.id)).map(section => section.title)
    const alphabetical = [...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))

    expect(dashboard.pages.map(candidate => candidate.name)).toEqual(['Metric Explorer', ...alphabetical])
  })

  test('has unique page names', () => {
    const names = build().pages.map(candidate => candidate.name)

    expect(new Set(names).size).toBe(names.length)
  })

  test('stays within the size of the hand-built dashboard, which has 18 pages and about 200 widgets', () => {
    const dashboard = build()

    expect(dashboard.pages.length).toBeLessThanOrEqual(20)
    expect(widgetsOf(dashboard).length).toBeLessThanOrEqual(200)
  })

  test('runs every query against the data account, and only against the Supportability event', () => {
    const dashboard = build(registry, { dataAccountId: 33 })

    widgetsOf(dashboard).filter(widget => widget.rawConfiguration.nrqlQueries).forEach(widget => {
      widget.rawConfiguration.nrqlQueries.forEach(({ accountIds, query }) => {
        expect(accountIds).toEqual([33])
        expect(query.startsWith('FROM Supportability ')).toBe(true)
      })
    })
  })

  test('keeps queries short enough to be safe', () => {
    expect(Math.max(...queriesOf(build()).map(query => query.length))).toBeLessThan(2000)
  })

  test('never has two widgets overlapping or sticking out of the 12 column grid', () => {
    build().pages.forEach(candidate => {
      candidate.widgets.forEach((a, i) => {
        expect(a.layout.column).toBeGreaterThanOrEqual(1)
        expect(a.layout.column + a.layout.width - 1).toBeLessThanOrEqual(12)
        candidate.widgets.slice(i + 1).forEach(b => {
          const overlaps = a.layout.column < b.layout.column + b.layout.width && b.layout.column < a.layout.column + a.layout.width &&
            a.layout.row < b.layout.row + b.layout.height && b.layout.row < a.layout.row + a.layout.height
          expect(overlaps).toBe(false)
        })
      })
    })
  })

  test('gives every chart a title and a known visualization', () => {
    widgetsOf(build()).filter(widget => widget.rawConfiguration.nrqlQueries).forEach(widget => {
      expect(widget.title).toBeTruthy()
      expect(['viz.line', 'viz.area', 'viz.bar', 'viz.pie', 'viz.table', 'viz.billboard']).toContain(widget.visualization.id)
    })
  })
})

describe('section pages', () => {
  const plain = page(build(small), 'Plain')
  const valued = page(build(small), 'Valued')
  const titles = (candidate) => candidate.widgets.map(widget => widget.title)
  const queryOf = (candidate, title) => candidate.widgets.find(widget => widget.title === title).rawConfiguration.nrqlQueries[0].query

  test('show the calls, accounts and apps reporting, several breakdowns by metric, and the top accounts and apps', () => {
    expect(titles(plain)).toEqual([
      'Metric Count: Plain', 'Accounts reporting: Plain', 'Apps reporting: Plain',
      'Plain: count over time by metric', 'Plain: share of calls by metric',
      'Plain: total calls by metric', 'Plain: accounts reporting by metric',
      'Plain: calls, accounts and apps by metric', 'Plain: count by account', 'Plain: count by app'
    ])
  })

  test('break a multi-metric section down by name with a pie, bars and a table', () => {
    const viz = (title) => plain.widgets.find(widget => widget.title === title).visualization.id

    expect(viz('Plain: share of calls by metric')).toBe('viz.pie')
    expect(viz('Plain: count over time by metric')).toBe('viz.area')
    expect(viz('Plain: total calls by metric')).toBe('viz.bar')
    expect(viz('Plain: calls, accounts and apps by metric')).toBe('viz.table')
    plain.widgets.filter(widget => /by metric$/.test(widget.title)).forEach(widget => expect(widget.rawConfiguration.nrqlQueries[0].query).toMatch(/FACET substring\(name, \d+\)/))
  })

  test('select the section\'s metrics', () => {
    expect(queryOf(plain, 'Plain: share of calls by metric')).toContain("name IN ('Browser/Supportability/Plain/One/Seen', 'Browser/Supportability/Plain/Two/Seen')")
  })

  test('have no average, minimum or maximum when no metric in the section reports a value', () => {
    expect(plain.widgets.some(widget => /average value|maximum value|minimum value/.test(widget.title))).toBe(false)
  })

  describe('chart titles say what data they show', () => {
    test('use the section\'s name when it holds several metrics', () => {
      titles(plain).forEach(title => expect(title).toContain('Plain'))
    })

    test('use the metric itself when the section is a single metric', () => {
      const one = page(build({ ...small, entries: [small.entries[0]] }), 'Plain')

      expect(titles(one)).toEqual(['Metric Count: Plain/One/Seen', 'Accounts reporting: Plain/One/Seen', 'Apps reporting: Plain/One/Seen', 'Plain/One/Seen: count', 'Plain/One/Seen: count by account', 'Plain/One/Seen: count by app'])
    })

    test('name the metrics that report a value in the average, maximum and minimum charts, with the unit', () => {
      expect(titles(valued)).toEqual(expect.arrayContaining([
        'Valued/Size: average value (bytes)', 'Valued/Size: maximum value (bytes)', 'Valued/Size: minimum value (bytes)',
        'Valued/Time/a: average value (ms)', 'Valued/Time/a: maximum value (ms)', 'Valued/Time/a: minimum value (ms)'
      ]))
    })

    test('name only the values of a family that report a value, not the family', () => {
      const replay = page(build(), 'Session Replay')
      const bytes = titles(replay).find(title => title.endsWith('average value (bytes)'))

      expect(bytes).toBe('SessionReplay/Abort/Too-Big, rrweb/node/<type>/bytes: average value (bytes)')
      expect(bytes).not.toContain('Abort/<reason>')
    })

    test('keep a family\'s placeholder when every value of it reports a value', () => {
      expect(titles(page(build(), 'Event Buffer'))).toContain('EventBuffer/<feature>/Dropped/Bytes: average value (bytes)')
    })

    test('name the AJAX payload metric, which was once only "Metrics that report a value"', () => {
      const ajax = titles(page(build(), 'AJAX'))

      expect(ajax).toContain('Ajax/Events/Payload/Bytes-Added: average value (bytes)')
      expect(ajax.some(title => title.includes('Metrics that report a value'))).toBe(false)
    })

    test('never title a chart generically on any page but the explorer', () => {
      build().pages.filter(candidate => candidate.name !== 'Metric Explorer').forEach(candidate => {
        candidate.widgets.filter(widget => widget.rawConfiguration.nrqlQueries).forEach(widget => {
          expect(widget.title).toMatch(/^.+: .+/)
          expect(widget.title).not.toMatch(/^(Rate|Calls|Total|Average|Maximum|Minimum)\b.*\(this section\)$/)
        })
      })
    })

    test('shorten a list of names that would make a very long title, saying how many were left out', () => {
      const many = { ...small, entries: Array.from({ length: 8 }, (_, i) => ({ section: 'valued', tag: `Valued/A/Long/Metric/Name/Number${i}`, description: 'd', value: { unit: 'ms' } })) }
      const title = page(build(many), 'Valued').widgets.map(widget => widget.title).find(candidate => candidate.includes('average value'))

      expect(title).toMatch(/\+\d+ more: average value \(ms\)$/)
      expect(title.length).toBeLessThan(140)
    })

    test('keeps every title in the real registry whole, with nothing left out', () => {
      const all = build().pages.filter(candidate => candidate.name !== 'Metric Explorer').flatMap(candidate => titles(candidate))

      expect(all.filter(title => /\+\d+ more/.test(title))).toEqual([])
    })
  })

  test('show the average, maximum and minimum for each unit that a metric in the section reports', () => {
    expect(titles(valued)).toEqual(expect.arrayContaining(['Valued/Size: average value (bytes)', 'Valued/Time/a: average value (ms)']))
  })

  test('chart only the values of a family that report one', () => {
    const averageMs = queryOf(valued, 'Valued/Time/a: average value (ms)')

    expect(averageMs).toContain("name = 'Browser/Supportability/Valued/Time/a'")
    expect(averageMs).not.toContain('Valued/Time/b')
  })

  test('open with the summary billboards and have no text box', () => {
    expect(plain.widgets[0].visualization.id).toBe('viz.billboard')
    expect(build().pages.flatMap(candidate => candidate.widgets).some(widget => widget.visualization.id === 'viz.markdown')).toBe(false)
  })

  test('omit the breakdowns by metric for a section with one metric', () => {
    const one = page(build({ ...small, entries: [small.entries[0]] }), 'Plain')

    expect(titles(one).some(title => title.includes('by metric'))).toBe(false)
    expect(one.widgets.find(widget => widget.title === 'Plain/One/Seen: count').layout.width).toBe(12)
  })

  test('match a family with a pattern rather than a list of names', () => {
    const families = page(build({ ...small, entries: [small.entries[3]] }), 'Valued')

    expect(queryOf(families, 'Valued/Time/<kind>: share of calls by metric')).toContain("name LIKE 'Browser/Supportability/Valued/Time/%'")
  })

  test('report the session replay abort size only for the reason that has one', () => {
    const replay = page(build(), 'Session Replay')
    const query = replay.widgets.find(widget => widget.title.includes('average value (bytes)')).rawConfiguration.nrqlQueries[0].query

    expect(query).toContain('SessionReplay/Abort/Too-Big')
    expect(query).not.toContain('SessionReplay/Abort/Reset')
  })
})

describe('metric explorer', () => {
  const dashboard = build()
  const explorer = page(dashboard, 'Metric Explorer')
  const charts = explorer.widgets.filter(widget => widget.rawConfiguration.nrqlQueries)

  test('opens straight on the charts, with no description box', () => {
    expect(explorer.widgets.some(widget => widget.visualization.id === 'viz.markdown')).toBe(false)
    expect(explorer.widgets[0].layout).toMatchObject({ column: 1, row: 1 })
  })

  test('shows the count, by account and by app, and the value charts for the selected metric', () => {
    expect(explorer.widgets.map(widget => widget.title).filter(Boolean)).toEqual(expect.arrayContaining(['Metric Count', 'Count', 'Count by account', 'Count by app', 'Selected metric: average value (value)']))
  })

  test('shows only the selected metric in every chart, by exact name, with the variable as the whole name', () => {
    expect(charts).toHaveLength(explorer.widgets.length)
    charts.forEach(widget => expect(widget.rawConfiguration.nrqlQueries[0].query).toContain('WHERE name = {{metric}}'))
  })

  test('does not build the name from a prefix and the variable, which charts do not support', () => {
    charts.forEach(widget => expect(widget.rawConfiguration.nrqlQueries[0].query).not.toContain("'Browser/Supportability/{{metric}}'"))
  })

  test('draws a single line for the selected metric, not one per name', () => {
    expect(explorer.widgets.find(widget => widget.title.includes('average value')).rawConfiguration.nrqlQueries[0].query).not.toContain('FACET')
  })
})

describe('faceted queries', () => {
  test('all ask for every facet, because a faceted query keeps only 10 by default', () => {
    const faceted = queriesOf(build()).filter(query => query.includes(' FACET '))

    expect(faceted.length).toBeGreaterThan(0)
    faceted.forEach(query => expect(query).toMatch(/LIMIT MAX$/))
  })
})

describe('the metric picker', () => {
  const dashboard = build()

  test('is a dropdown filled from the data, so new metrics appear without regenerating', () => {
    expect(dashboard.variables).toHaveLength(1)
    expect(dashboard.variables[0]).toMatchObject({ name: METRIC_VARIABLE, type: 'NRQL', replacementStrategy: 'STRING', isMultiSelection: false })
    expect(dashboard.variables[0].nrqlQuery.query).toContain('uniques(name)')
    expect(dashboard.variables[0].nrqlQuery.accountIds).toEqual([432507])
  })

  test('lists the full names, with the Browser/Supportability/ prefix', () => {
    expect(dashboard.variables[0].nrqlQuery.query).not.toContain('substring')
    expect(dashboard.variables[0].nrqlQuery.query).toContain("WHERE name LIKE 'Browser/Supportability/%'")
  })

  test('is called Supportability Metric', () => {
    expect(dashboard.variables[0].title).toBe('Supportability Metric')
  })

  test('has no default, so nothing is selected until a viewer picks a metric', () => {
    expect(dashboard.variables[0].defaultValues).toBeNull()
  })

  test('is used by the metric explorer and by no other page', () => {
    dashboard.pages.filter(candidate => candidate.name !== 'Metric Explorer').forEach(candidate => {
      candidate.widgets.filter(widget => widget.rawConfiguration.nrqlQueries).forEach(widget => {
        expect(widget.rawConfiguration.nrqlQueries[0].query).not.toContain('{{')
      })
    })
  })

  test('leaves the section pages showing their whole section, whatever is picked', () => {
    const query = page(dashboard, 'Session').widgets.find(widget => widget.title === 'Session/RaceCondition/Seen: count').rawConfiguration.nrqlQueries[0].query

    expect(query).toBe("FROM Supportability SELECT sum(call_count) WHERE name = 'Browser/Supportability/Session/RaceCondition/Seen' FACET substring(name, 23) TIMESERIES 1 hour LIMIT MAX")
  })
})

describe('Grid', () => {
  test('places widgets left to right and wraps to a new row when one does not fit', () => {
    const grid = new Grid()

    expect(grid.place(8, 4)).toEqual({ column: 1, row: 1, width: 8, height: 4 })
    expect(grid.place(4, 3)).toEqual({ column: 9, row: 1, width: 4, height: 3 })
    expect(grid.place(6, 4)).toEqual({ column: 1, row: 5, width: 6, height: 4 })
  })

  test('nextRow starts a new row below the tallest widget', () => {
    const grid = new Grid()
    grid.place(4, 3)
    grid.place(4, 5)
    grid.nextRow()

    expect(grid.place(4, 3)).toMatchObject({ column: 1, row: 6 })
  })
})
