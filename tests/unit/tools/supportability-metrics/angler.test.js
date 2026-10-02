const { PREFIX, ANGLER_REPO_URL, ANGLER_FILE_URL, listConcreteTags, diffRegistries, renderComment } = require('../../../../tools/supportability-metrics/angler')

const entries = [
  { section: 'session', tag: 'Session/RaceCondition/Seen', description: 'd' },
  { section: 'api', tag: 'API/<name>/called', description: 'd', values: ['addPageAction', 'log'] },
  { section: 'config', tag: 'Config/<init path>/Enabled', description: 'd' },
  { section: 'flags', tag: 'Feature_Flag/<flag>/Seen', description: 'd' },
  { section: 'harvester', tag: 'Harvester/Retry/Failed/<code>', description: 'd' },
  { section: 'harvester', tag: 'Harvester/Retry/Attempted/<feature>', description: 'd' }
]
const head = { header: 'h', sections: [], entries }
const without = (tag) => ({ ...head, entries: entries.filter(entry => entry.tag !== tag) })
const withEntry = (entry) => ({ ...head, entries: [...entries, entry] })

describe('loading in CI', () => {
  test('does not load the JavaScript parser, because the pull request comment job runs plain node with nothing installed', () => {
    jest.isolateModules(() => {
      jest.doMock('acorn', () => { throw new Error('acorn must not be loaded by the pull request comment script') })
      jest.doMock('acorn-walk', () => { throw new Error('acorn-walk must not be loaded by the pull request comment script') })

      expect(() => require('../../../../tools/supportability-metrics/angler')).not.toThrow()
    })
  })
})

describe('listConcreteTags', () => {
  test('lists single metrics and expanded families with the prefix, and skips open-ended families', () => {
    expect(listConcreteTags(head)).toEqual([
      PREFIX + 'Session/RaceCondition/Seen',
      PREFIX + 'API/addPageAction/called',
      PREFIX + 'API/log/called'
    ])
  })

  test('lists nothing for a missing registry', () => {
    expect(listConcreteTags(undefined)).toEqual([])
  })

  test('does not repeat a name', () => {
    const duplicated = { ...head, entries: [entries[0], { ...entries[0] }] }

    expect(listConcreteTags(duplicated)).toEqual([PREFIX + 'Session/RaceCondition/Seen'])
  })
})

describe('diffRegistries', () => {
  test('is not relevant when the registry is unchanged', () => {
    expect(diffRegistries(head, head).relevant).toBe(false)
  })

  test('is not relevant when only the header changes', () => {
    expect(diffRegistries(head, { ...head, header: 'different' }).relevant).toBe(false)
  })

  test('reports names added and removed', () => {
    const added = diffRegistries(without('Session/RaceCondition/Seen'), head)
    const removed = diffRegistries(head, without('Session/RaceCondition/Seen'))

    expect(added).toMatchObject({ relevant: true, added: [PREFIX + 'Session/RaceCondition/Seen'], removed: [] })
    expect(removed).toMatchObject({ relevant: true, added: [], removed: [PREFIX + 'Session/RaceCondition/Seen'] })
  })

  test('reports an open-ended family that was added or changed', () => {
    const changed = { ...head, entries: entries.map(entry => entry.tag === 'Feature_Flag/<flag>/Seen' ? { ...entry, description: 'new wording' } : entry) }

    expect(diffRegistries(head, changed).changedOpenFamilies).toEqual(['Feature_Flag/<flag>/Seen'])
  })

  test('treats every name as new when the base has no registry', () => {
    expect(diffRegistries(undefined, head)).toMatchObject({ relevant: true, added: listConcreteTags(head), removed: [] })
  })
})

describe('renderComment', () => {
  test('is collapsed by default, with a summary line that shows the counts', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment.startsWith('<details>\n<summary>')).toBe(true)
    expect(comment).not.toMatch(/<details[^>]*\bopen\b/)
    expect(comment).toMatch(/<summary><strong>Supportability metrics changed: this PR needs a matching Angler PR<\/strong> \(1 name to add, 0 removed, 4 families to decide\)<\/summary>/)
    expect(comment.trimEnd().endsWith('</details>')).toBe(true)
  })

  test('uses the singular for one family to decide', () => {
    const one = { ...head, entries: [entries[0], entries[2]] }

    expect(renderComment(undefined, one)).toContain('1 family to decide')
  })

  test('counts removals in the summary', () => {
    expect(renderComment(head, without('Session/RaceCondition/Seen'))).toContain('0 names to add, 1 removed')
  })

  test('leaves a blank line after the summary so the markdown inside renders', () => {
    expect(renderComment(without('Session/RaceCondition/Seen'), head)).toMatch(/<\/summary>\n\nThis PR changes/)
  })

  test('returns nothing when the pull request does not change the registry', () => {
    expect(renderComment(head, head)).toBeUndefined()
  })

  test('tells the author to open a pull request against Angler, with links to the repo and the file', () => {
    const comment = renderComment(without('API/<name>/called'), head)

    expect(comment).toContain('Open a pull request against **[agents/angler](' + ANGLER_REPO_URL + ')**')
    expect(comment).toContain(ANGLER_FILE_URL)
    expect(comment).toContain('Link the Angler PR here')
  })

  test('lists the names to add in a code block', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment).toContain('### Add to Angler (1 name)')
    expect(comment).toContain('```text\n' + PREFIX + 'Session/RaceCondition/Seen\n```')
  })

  test('says so when there is nothing new to add', () => {
    const comment = renderComment(head, withEntry({ section: 'config', tag: 'Config/<other>/Changed', description: 'd' }))

    expect(comment).toContain('_No new names in this PR._')
  })

  test('warns not to delete removed names yet, because older agents still send them', () => {
    const comment = renderComment(head, without('Session/RaceCondition/Seen'))

    expect(comment).toContain('### Removed in this PR (1 name)')
    expect(comment).toContain('Do not delete these from Angler yet')
    expect(comment).toContain('Older agent versions')
  })

  test('calls out every open-ended family as a decision for the author, with a checkbox and a hint', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment).toContain('### Needs your decision (cannot be generated)')
    expect(comment).toContain('- [ ] **`' + PREFIX + 'Config/<init path>/Enabled`**')
    expect(comment).toContain('- [ ] **`' + PREFIX + 'Feature_Flag/<flag>/Seen`**')
    expect(comment).toContain('- [ ] **`' + PREFIX + 'Harvester/Retry/Failed/<code>`**')
    expect(comment).toContain('new feature flag')
    expect(comment).toContain('HTTP status codes')
    expect(comment).toMatch(/Attempted\/<feature>`\*\*: Decide which features/)
  })

  test('marks the open-ended families this pull request changed', () => {
    const comment = renderComment(head, { ...head, entries: entries.map(entry => entry.tag === 'Feature_Flag/<flag>/Seen' ? { ...entry, description: 'new wording' } : entry) })

    expect(comment).toContain('`' + PREFIX + 'Feature_Flag/<flag>/Seen`** _(changed in this PR)_')
    expect(comment).not.toContain('`' + PREFIX + 'Config/<init path>/Enabled`** _(changed in this PR)_')
  })

  test('includes the full list of names Angler should hold, collapsed', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment).toContain('<details><summary>Full list of names Angler should contain')
    expect(comment).toContain('(3 names)')
    expect(comment).toContain(PREFIX + 'API/log/called')
    expect(comment).toContain('</details>')
  })

  test('explains that every name is new when the base branch has no registry', () => {
    expect(renderComment(undefined, head)).toContain('does not exist on the base branch')
  })

  test('has no indented lines, because the comment action trims every line', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment.split('\n').filter(line => /^\s+\S/.test(line))).toEqual([])
  })
})
