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

describe('renderComment status', () => {
  const none = { addedSettings: [], removedSettings: [], addedFlags: [] }
  const onlyDescriptionChanged = { ...head, entries: entries.map(entry => entry.tag === 'Session/RaceCondition/Seen' ? { ...entry, description: 'new wording' } : entry) }

  test('is green when the registry changed but nothing needs to change in Angler', () => {
    const comment = renderComment(head, onlyDescriptionChanged, none)

    expect(comment).toContain('<summary>🟢 <strong>Supportability metrics changed: no Angler changes needed</strong> (0 names to add, 0 removed, no decisions)</summary>')
    expect(comment).toContain('nothing needs to change in Angler')
    expect(comment).not.toContain('### What you need to do')
    expect(comment).not.toContain('needs a matching Angler PR')
    expect(comment).not.toContain('### Add to Angler')
    expect(comment).not.toContain('Needs your decision')
  })

  test('is yellow when the only change is removals, which should wait for older agents', () => {
    const comment = renderComment(head, without('Session/RaceCondition/Seen'), none)

    expect(comment).toContain('<summary>🟡 <strong>Supportability metrics changed: no Angler PR needed yet</strong> (0 names to add, 1 removed, no decisions)</summary>')
    expect(comment).toContain('Nothing in Angler yet')
    expect(comment).toContain('### Removed in this PR (1 name)')
    expect(comment).not.toContain('Open a pull request against')
    expect(comment).not.toContain('### Add to Angler')
  })

  test('is orange when there are names to add', () => {
    expect(renderComment(without('Session/RaceCondition/Seen'), head, none)).toContain('<summary>🟠 <strong>Supportability metrics changed: this PR needs a matching Angler PR</strong>')
  })

  test('is orange when there are decisions to make, even with nothing to add', () => {
    const comment = renderComment(head, onlyDescriptionChanged, { ...none, addedFlags: ['a_flag'] })

    expect(comment).toContain('<summary>🟠 ')
    expect(comment).toContain('(0 names to add, 0 removed, 1 decision)')
  })

  test('is orange, not yellow, when names are removed and added together', () => {
    const base = withEntry({ section: 'session', tag: 'Gone/Metric/Seen', description: 'd' })
    const headWithNewName = { ...head, entries: [...entries, { section: 'session', tag: 'New/Metric/Seen', description: 'd' }] }

    expect(renderComment(base, headWithNewName, none)).toContain('<summary>🟠 ')
  })
})

describe('renderComment', () => {
  test('is collapsed by default, with a summary line that shows the counts', () => {
    const comment = renderComment(without('Session/RaceCondition/Seen'), head)

    expect(comment.startsWith('<details>\n<summary>')).toBe(true)
    expect(comment).not.toMatch(/<details[^>]*\bopen\b/)
    expect(comment).toMatch(/<summary>🟠 <strong>Supportability metrics changed: this PR needs a matching Angler PR<\/strong> \(1 name to add, 0 removed, 2 decisions\)<\/summary>/)
    expect(comment.trimEnd().endsWith('</details>')).toBe(true)
  })

  test('uses the singular for one decision', () => {
    const detected = { addedSettings: [], removedSettings: [], addedFlags: ['one_flag'] }

    expect(renderComment(head, without('Session/RaceCondition/Seen'), detected)).toContain('0 names to add, 1 removed')
    expect(renderComment(without('Session/RaceCondition/Seen'), head, detected)).toContain('1 name to add, 0 removed, 1 decision)')
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

  describe('the checklist of decisions', () => {
    const none = { addedSettings: [], removedSettings: [], addedFlags: [] }
    const withBase = without('Session/RaceCondition/Seen')

    test('falls back to telling the author what to check when the change could not be analyzed', () => {
      const comment = renderComment(withBase, head)

      expect(comment).toContain('### Needs your decision (cannot be generated)')
      expect(comment).toContain('could not be analyzed automatically')
      expect(comment).toContain('- [ ] **`' + PREFIX + 'Config/<init path>/Enabled`**')
      expect(comment).toContain('- [ ] **`' + PREFIX + 'Feature_Flag/<flag>/Seen`**')
      expect(comment).toContain('new feature flag')
    })

    test('does not list families that this PR did not touch, such as status codes', () => {
      const comment = renderComment(withBase, head, none)

      expect(comment).not.toContain('Harvester/Retry/Failed/<code>`**')
      expect(comment).not.toContain('Harvester/Retry/Attempted/<feature>`**')
      expect(comment).not.toContain('Config/<init path>/Enabled`**')
    })

    test('says nothing needs a decision, and drops that step, when the PR touches nothing manual', () => {
      const comment = renderComment(withBase, head, none)

      expect(comment).toContain('Nothing in this PR needs a manual decision in Angler')
      expect(comment).not.toContain('- [ ]')
      expect(comment).not.toContain('Work through **Needs your decision**')
      expect(comment).toContain('3. Link the Angler PR here')
      expect(comment).toContain('(1 name to add, 0 removed, no decisions)')
    })

    test('lists the exact names for new init settings, by kind', () => {
      const comment = renderComment(withBase, head, { ...none, addedSettings: [{ path: 'session_replay.new_thing', tag: 'Config/session_replay/new_thing/Enabled' }, { path: 'harvest.limit', tag: 'Config/harvest/limit/Changed' }] })

      expect(comment).toContain('- [ ] **`' + PREFIX + 'Config/session_replay/new_thing/Enabled`**: new `init` setting `session_replay.new_thing`. It is reported only when a customer sets it to true.')
      expect(comment).toContain('- [ ] **`' + PREFIX + 'Config/harvest/limit/Changed`**: new `init` setting `harvest.limit`. It is reported only when a customer sets a non-default value.')
      expect(comment).toContain('4. Link the Angler PR here')
    })

    test('lists removed init settings, with the warning to wait for older agents', () => {
      const comment = renderComment(withBase, head, { ...none, removedSettings: [{ path: 'old.setting', tag: 'Config/old/setting/Enabled' }] })

      expect(comment).toContain('- [ ] **`' + PREFIX + 'Config/old/setting/Enabled`**: `init` setting `old.setting` was removed.')
      expect(comment).toContain('aged out')
    })

    test('lists the exact name for each new feature flag', () => {
      const comment = renderComment(withBase, head, { ...none, addedFlags: ['brand_new_flag'] })

      expect(comment).toContain('- [ ] **`' + PREFIX + 'Feature_Flag/brand_new_flag/Seen`**: new feature flag `brand_new_flag`.')
    })

    test('lists an open-ended family only when this PR changed its registry entry, and marks it', () => {
      const changed = { ...head, entries: entries.map(entry => entry.tag === 'Harvester/Retry/Failed/<code>' ? { ...entry, description: 'new wording' } : entry) }
      const comment = renderComment(head, changed, none)

      expect(comment).toContain('- [ ] **`' + PREFIX + 'Harvester/Retry/Failed/<code>`**')
      expect(comment).toContain('_(this PR changed this family)_')
      expect(comment).not.toContain('Harvester/Retry/Attempted/<feature>`**')
    })

    test('does not treat every family as changed when the base has no registry', () => {
      expect(renderComment(undefined, head, none)).toContain('Nothing in this PR needs a manual decision')
    })

    test('uses a status code hint for status code families and a feature hint for the retry attempts', () => {
      const changed = { ...head, entries: entries.map(entry => entry.tag.startsWith('Harvester/') ? { ...entry, description: 'new wording' } : entry) }
      const comment = renderComment(head, changed, none)

      expect(comment).toContain('Failed/<code>`**: Decide which HTTP status codes')
      expect(comment).toMatch(/Attempted\/<feature>`\*\*: Decide which features/)
    })
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
