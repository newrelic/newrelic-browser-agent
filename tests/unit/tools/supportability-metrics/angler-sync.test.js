const { syncBrowserTags, renderSummary } = require('../../../../tools/supportability-metrics/angler-sync')
const { PREFIX } = require('../../../../tools/supportability-metrics/angler')

const b = (name) => PREFIX + name
const lines = (...all) => all.join('\n') + '\n'

describe('syncBrowserTags: other teams\' names', () => {
  const others = [
    'Supportability/Java/AgentVersion',
    '# python agent',
    'Supportability/Python/Thing',
    '',
    'Browser/Other/NotSupportability',
    `# ${b('Commented/Out')}`,
    'Custom/SomeTeam/Metric'
  ]

  test('never removes, changes or reorders a line that is not a browser agent name', () => {
    const existing = lines(others[0], b('Old/Gone'), others[1], others[2], b('Kept/One'), ...others.slice(3))
    const { text } = syncBrowserTags(existing, [b('Kept/One'), b('New/One')])

    expect(text.split('\n').filter(line => !line.startsWith(PREFIX))).toEqual(existing.split('\n').filter(line => !line.startsWith(PREFIX)))
  })

  test('only ever removes lines that start with the browser agent prefix', () => {
    const { removed } = syncBrowserTags(lines(...others, b('Old/Gone')), [])

    expect(removed).toEqual([b('Old/Gone')])
  })

  test('leaves a commented-out browser agent name and other Browser/ names alone', () => {
    const { text } = syncBrowserTags(lines(...others, b('Old/Gone')), [b('New/One')])

    expect(text).toContain(`# ${b('Commented/Out')}`)
    expect(text).toContain('Browser/Other/NotSupportability')
    expect(text).not.toContain('Old/Gone')
  })

  test('keeps the other teams\' names even when the browser agent set is empty', () => {
    const { text } = syncBrowserTags(lines(...others, b('Old/Gone')), [])

    others.forEach(line => expect(text).toContain(line))
  })

  test('refuses to write a name without the prefix, so it cannot add to another team\'s names', () => {
    expect(() => syncBrowserTags(lines(...others), ['Supportability/Java/Sneaky'])).toThrow(/do not start with/)
  })
})

describe('syncBrowserTags: the browser agent block', () => {
  test('replaces the block where it was, and reports what was added, removed and unchanged', () => {
    const result = syncBrowserTags(lines('A/first', b('Old/Gone'), b('Kept/One'), 'Z/last'), [b('Kept/One'), b('New/One')])

    expect(result.text).toBe(lines('A/first', b('Kept/One'), b('New/One'), 'Z/last'))
    expect(result.added).toEqual([b('New/One')])
    expect(result.removed).toEqual([b('Old/Gone')])
    expect(result.unchanged).toBe(1)
    expect(result.scattered).toBe(false)
  })

  test('writes the names in the order given, without duplicates', () => {
    const { text } = syncBrowserTags(lines(b('B'), b('A')), [b('A'), b('B'), b('A')])

    expect(text).toBe(lines(b('A'), b('B')))
  })

  test('appends the names to the end when the file has none', () => {
    expect(syncBrowserTags(lines('X/one', 'X/two'), [b('New')]).text).toBe(lines('X/one', 'X/two', b('New')))
  })

  test('changes nothing when the file already has exactly these names', () => {
    const existing = lines('X/one', b('A'), b('B'), 'X/two')
    const result = syncBrowserTags(existing, [b('A'), b('B')])

    expect(result.text).toBe(existing)
    expect([result.added, result.removed, result.scattered]).toEqual([[], [], false])
  })

  test('keeps the names already in the file when told to, so nothing is removed', () => {
    const result = syncBrowserTags(lines(b('Old/Gone'), b('Kept')), [b('Kept'), b('New')], { keepExisting: true })

    expect(result.removed).toEqual([])
    expect(result.text).toBe(lines(b('Kept'), b('New'), b('Old/Gone')))
  })

  test('says so when the browser agent names were spread through the file, because they are gathered into one block', () => {
    const result = syncBrowserTags(lines(b('A'), '# other team', b('B')), [b('A'), b('B')])

    expect(result.scattered).toBe(true)
    expect(result.text).toBe(lines(b('A'), b('B'), '# other team'))
  })

  test('keeps Windows line endings and a missing final newline as they were', () => {
    expect(syncBrowserTags('X\r\n' + b('Old') + '\r\nY\r\n', [b('New')]).text).toBe('X\r\n' + b('New') + '\r\nY\r\n')
    expect(syncBrowserTags('X\n' + b('Old') + '\nY', [b('New')]).text).toBe('X\n' + b('New') + '\nY')
  })

  test('treats an indented or padded browser agent name as a browser agent name', () => {
    expect(syncBrowserTags(`  ${b('Old')}  \n`, [b('New')]).removed).toEqual([b('Old')])
  })
})

describe('renderSummary', () => {
  test('says no other line changed, and lists what was removed with the warning about older agents', () => {
    const summary = renderSummary(syncBrowserTags(lines(b('Old/Gone'), b('Kept')), [b('Kept'), b('New')]), 2)

    expect(summary).toContain('No other line of the file is changed')
    expect(summary).toContain('**1** added, **1** removed, **1** unchanged')
    expect(summary).toContain('Older browser agent versions already in the wild')
    expect(summary).toContain(b('Old/Gone'))
  })
})
