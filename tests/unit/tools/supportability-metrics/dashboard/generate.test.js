const { buildDashboard, Grid, EXPLORER_VARIABLE } = require('../../../../../tools/supportability-metrics/dashboard/generate')
const registry = require('../../../../../tools/supportability-metrics/registry')

const build = (reg = registry, options = {}) => buildDashboard(reg, { dataAccountId: 432507, name: 'Test dashboard', ...options })
const widgetsOf = (dashboard) => dashboard.pages.flatMap(page => page.widgets)
const queriesOf = (dashboard) => widgetsOf(dashboard).flatMap(widget => widget.rawConfiguration.nrqlQueries || []).map(query => query.query)
const page = (dashboard, name) => dashboard.pages.find(candidate => candidate.name === name)

const small = {
  header: 'h',
  sections: [{ id: 'plain', title: 'Plain' }, { id: 'valued', title: 'Valued', intro: 'Intro text' }, { id: 'empty', title: 'Empty' }],
  entries: [
    { section: 'plain', tag: 'Plain/One/Seen', description: 'd' },
    { section: 'plain', tag: 'Plain/Two/Seen', description: 'd' },
    { section: 'valued', tag: 'Valued/Size', description: 'd', value: { unit: 'bytes' } },
    { section: 'valued', tag: 'Valued/Time/<kind>', description: 'd', values: ['a', 'b'], value: { unit: 'ms', for: ['a'] } }
  ]
}

describe('buildDashboard', () => {
  test('is named, described as generated, and read only so nobody edits it by hand', () => {
    const dashboard = build(small, { name: 'My name' })

    expect(dashboard.name).toBe('My name')
    expect(dashboard.description).toContain('Generated')
    expect(dashboard.permissions).toBe('PUBLIC_READ_ONLY')
  })

  test('has an overview first, a page for each section that has entries, and the explorer last', () => {
    expect(build(small).pages.map(candidate => candidate.name)).toEqual(['Overview', 'Plain', 'Valued', 'Metric Explorer'])
  })

  test('has a page for every section of the real registry that has entries', () => {
    const dashboard = build()
    const sections = registry.sections.filter(section => registry.entries.some(entry => entry.section === section.id))

    expect(dashboard.pages.map(candidate => candidate.name)).toEqual(['Overview', ...sections.map(section => section.title), 'Metric Explorer'])
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

  test('show the calls, accounts and apps reporting, the rate and total by metric, and the top accounts and apps', () => {
    expect(plain.widgets.map(widget => widget.title)).toEqual(['Calls (this section)', 'Accounts reporting', 'Apps reporting', 'Rate by metric', 'Total by metric', 'Rate by account (top 10)', 'Rate by app (top 10)'])
  })

  test('select the section\'s metrics', () => {
    expect(plain.widgets[3].rawConfiguration.nrqlQueries[0].query).toContain("name IN ('Browser/Supportability/Plain/One/Seen', 'Browser/Supportability/Plain/Two/Seen')")
  })

  test('have no average, minimum or maximum when no metric in the section reports a value', () => {
    expect(plain.widgets.some(widget => /average value|maximum value|minimum value/.test(widget.title))).toBe(false)
  })

  test('show the average, maximum and minimum for each unit that a metric in the section reports', () => {
    const titles = valued.widgets.map(widget => widget.title)

    expect(titles).toEqual(expect.arrayContaining(['Metrics that report a value: average value (bytes)', 'Metrics that report a value: maximum value (bytes)', 'Metrics that report a value: minimum value (bytes)']))
    expect(titles).toEqual(expect.arrayContaining(['Metrics that report a value: average value (ms)']))
  })

  test('chart only the values of a family that report one', () => {
    const averageMs = valued.widgets.find(widget => widget.title.endsWith('average value (ms)')).rawConfiguration.nrqlQueries[0].query

    expect(averageMs).toContain("name = 'Browser/Supportability/Valued/Time/a'")
    expect(averageMs).not.toContain('Valued/Time/b')
  })

  test('start with the section\'s intro when it has one, and not otherwise', () => {
    expect(valued.widgets[0].visualization.id).toBe('viz.markdown')
    expect(valued.widgets[0].rawConfiguration.text).toBe('Intro text')
    expect(plain.widgets[0].visualization.id).toBe('viz.billboard')
  })

  test('omit the per-metric bar for a section with one metric', () => {
    const one = page(build({ ...small, entries: [small.entries[0]] }), 'Plain')

    expect(one.widgets.some(widget => widget.title === 'Total by metric')).toBe(false)
    expect(one.widgets.find(widget => widget.title === 'Rate by metric').layout.width).toBe(12)
  })

  test('match a family with a pattern rather than a list of names', () => {
    const families = page(build({ ...small, entries: [small.entries[3]] }), 'Valued')

    expect(families.widgets.find(widget => widget.title === 'Rate by metric').rawConfiguration.nrqlQueries[0].query).toContain("name LIKE 'Browser/Supportability/Valued/Time/%'")
  })

  test('report the session replay abort size only for the reason that has one', () => {
    const replay = page(build(), 'Session Replay')
    const query = replay.widgets.find(widget => widget.title.includes('average value (bytes)')).rawConfiguration.nrqlQueries[0].query

    expect(query).toContain('SessionReplay/Abort/Too-Big')
    expect(query).not.toContain('SessionReplay/Abort/Reset')
  })
})

describe('overview', () => {
  const overview = page(build(), 'Overview')

  test('says it is generated, where to change it, and links the registry and the hand-built dashboard', () => {
    const text = overview.widgets[0].rawConfiguration.text

    expect(text).toContain('generated')
    expect(text).toContain('tools/supportability-metrics/registry.js')
    expect(text).toContain('https://onenr.io/07jbyP2q3Ry')
  })

  test('covers every supportability metric, not just registered ones', () => {
    expect(overview.widgets.find(widget => widget.title === 'Calls (all metrics)').rawConfiguration.nrqlQueries[0].query).toContain("name LIKE 'Browser/Supportability/%'")
  })
})

describe('metric explorer', () => {
  const dashboard = build()
  const explorer = page(dashboard, 'Metric Explorer')

  test('has a picker filled from the data, so new metrics appear without regenerating', () => {
    expect(dashboard.variables).toHaveLength(1)
    expect(dashboard.variables[0]).toMatchObject({ name: EXPLORER_VARIABLE, type: 'NRQL', replacementStrategy: 'STRING', isMultiSelection: false })
    expect(dashboard.variables[0].nrqlQuery.query).toContain('uniques(name)')
    expect(dashboard.variables[0].nrqlQuery.accountIds).toEqual([432507])
  })

  test('shows the rate, by account and by app, and the value charts for the selected metric', () => {
    expect(explorer.widgets.map(widget => widget.title).filter(Boolean)).toEqual(expect.arrayContaining(['Calls', 'Rate', 'Rate by account (top 10)', 'Rate by app (top 10)', 'Selected metric: average value (value)']))
  })

  test('selects the metric with the picker', () => {
    explorer.widgets.filter(widget => widget.rawConfiguration.nrqlQueries).forEach(widget => {
      expect(widget.rawConfiguration.nrqlQueries[0].query).toContain('name = {{metric_name}}')
    })
  })

  test('draws a single line for the selected metric, not one per name', () => {
    expect(explorer.widgets.find(widget => widget.title.includes('average value')).rawConfiguration.nrqlQueries[0].query).not.toContain('FACET')
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
