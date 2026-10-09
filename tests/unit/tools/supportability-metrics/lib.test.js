const fs = require('fs')
const path = require('path')
const { collectEmissions, compare, checkValues, expandEntry, renderDocs, renderStubs, appendToRegistry, appendToPending, registryLocation, checkRepo, TODO_DESCRIPTION } = require('../../../../tools/supportability-metrics/lib')
const registry = require('../../../../tools/supportability-metrics/registry')

const patterns = (code) => collectEmissions(code).filter(emission => !emission.unresolved).map(emission => emission.pattern)
const unresolved = (code) => collectEmissions(code).filter(emission => emission.unresolved)

describe('collectEmissions', () => {
  test('reads a literal passed to reportSupportabilityMetric', () => {
    expect(patterns("reportSupportabilityMetric(this.ee, 'Some/Metric')")).toEqual(['Some/Metric'])
  })

  test('reads the name from the second argument, after the emitter', () => {
    expect(patterns("reportSupportabilityMetric(ee, 'Some/Metric', 5)")).toEqual(['Some/Metric'])
  })

  test('reads storeSupportabilityMetrics calls', () => {
    expect(patterns("this.storeSupportabilityMetrics('Some/Metric')")).toEqual(['Some/Metric'])
  })

  test('reads a call with an optional chained emitter', () => {
    expect(patterns("reportSupportabilityMetric(this.featureAgg?.ee, 'Some/Metric')")).toEqual(['Some/Metric'])
  })

  test('turns template expressions into wildcards', () => {
    // eslint-disable-next-line no-template-curly-in-string
    expect(patterns('reportSupportabilityMetric(ee, `Thing/${name}/Seen`)')).toEqual(['Thing/<*>/Seen'])
  })

  test('turns concatenated unknowns into wildcards', () => {
    expect(patterns("reportSupportabilityMetric(ee, 'API/' + name + '/called')")).toEqual(['API/<*>/called'])
  })

  test('resolves same-file string constants, including constants built from other constants', () => {
    const code = "const BASE = 'A/B/'\nconst FULL = BASE + 'C/'\nreportSupportabilityMetric(ee, FULL + 'Seen')"
    expect(patterns(code)).toEqual(['A/B/C/Seen'])
  })

  test('reads the raw handle form that reportSupportabilityMetric wraps, by constant or by channel string', () => {
    expect(patterns("handle(SUPPORTABILITY_METRIC_CHANNEL, ['Raw/One'], undefined, 'metrics', ee)")).toEqual(['Raw/One'])
    expect(patterns("handle('storeSupportabilityMetrics', ['Raw/Two', 5], undefined, 'metrics', ee)")).toEqual(['Raw/Two'])
  })

  test('ignores handle calls on other channels', () => {
    expect(patterns("handle('log', ['Not/A/Metric'], undefined, 'logging', ee)")).toEqual([])
  })

  test('resolves a same-file arrow helper that builds a name', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const code = 'const tag = inject => `Buffer/${inject}/Dropped`\nreportSupportabilityMetric(ee, tag(feature))\nreportSupportabilityMetric(ee, tag("fixed"))'
    expect(patterns(code)).toEqual(['Buffer/<*>/Dropped', 'Buffer/fixed/Dropped'])
  })

  test('does not treat inherited object properties as reporters', () => {
    expect(collectEmissions("obj.hasOwnProperty('x'); value.toString(); constructor('y')")).toEqual([])
  })

  describe('a name that cannot be determined', () => {
    test('is reported as unresolved and not forwarded', () => {
      expect(unresolved('reportSupportabilityMetric(this.ee, metricName, value)')).toEqual([expect.objectContaining({ unresolved: true, forwarded: false, line: 1 })])
    })

    test('covers an imported constant, which the scan cannot read', () => {
      expect(unresolved('reportSupportabilityMetric(ee, IMPORTED_NAME)')).toHaveLength(1)
    })

    test('is marked forwarded by a comment on the line above', () => {
      expect(unresolved('/* sm-registry: forwards names registered elsewhere */\nreportSupportabilityMetric(ee, name)')[0].forwarded).toBe(true)
    })

    test('is marked forwarded by a comment on the same line', () => {
      expect(unresolved('reportSupportabilityMetric(ee, name) // sm-registry: forwards names registered elsewhere')[0].forwarded).toBe(true)
    })

    test('is not marked forwarded by a comment further away', () => {
      expect(unresolved('/* sm-registry: forwards x */\n\nreportSupportabilityMetric(ee, name)')[0].forwarded).toBe(false)
    })

    test('is left out of the registry comparison', () => {
      const registry = { entries: [{ tag: 'Known/Metric' }] }
      expect(compare(collectEmissions('reportSupportabilityMetric(ee, name)'), registry).unregistered).toEqual([])
    })
  })

  test('ignores unrelated calls', () => {
    expect(patterns("doSomething('Not/A/Metric')")).toEqual([])
  })

  test('reads the reason of an internal-error emit, resolving constants', () => {
    const code = "const EVT = 'internal-error'\nconst WHY = 'Some-Reason'\nee.emit(EVT, [err, WHY])"
    expect(patterns(code)).toEqual(['Internal/Error/Some-Reason'])
  })

  test('reports an internal-error emit with no reason as Other', () => {
    expect(patterns("ee.emit('internal-error', [err])")).toEqual(['Internal/Error/Other'])
  })

  test('reports the line of the call', () => {
    expect(collectEmissions("\n\nreportSupportabilityMetric(ee, 'X/Y')")[0].line).toEqual(3)
  })
})

describe('compare', () => {
  const reg = {
    entries: [
      { tag: 'Plain/Metric/Seen' },
      { tag: 'Family/<kind>/Seen', values: ['a', 'b'] },
      { tag: 'Open/<thing>/Seen' },
      { tag: 'Hidden/Metric/Seen', indirect: 'built elsewhere' }
    ]
  }
  const emit = (...list) => list.map(pattern => ({ pattern, file: 'f.js', line: 1 }))

  test('accepts a literal that matches an entry', () => {
    expect(compare(emit('Plain/Metric/Seen'), reg).unregistered).toEqual([])
  })

  test('flags a literal that matches no entry', () => {
    expect(compare(emit('Nope/Metric/Seen'), reg).unregistered.map(e => e.pattern)).toEqual(['Nope/Metric/Seen'])
  })

  test('accepts a literal that is one of a family\'s values', () => {
    expect(compare(emit('Family/a/Seen'), reg).unregistered).toEqual([])
  })

  test('flags a literal that is not one of a family\'s values', () => {
    expect(compare(emit('Family/z/Seen'), reg).unregistered.map(e => e.pattern)).toEqual(['Family/z/Seen'])
  })

  test('accepts any literal for a family with no values', () => {
    expect(compare(emit('Open/whatever/Seen'), reg).unregistered).toEqual([])
  })

  test('accepts a wildcard emission that has the same shape as an entry', () => {
    expect(compare(emit('Family/<*>/Seen'), reg).unregistered).toEqual([])
  })

  test('flags a wildcard emission with no matching shape', () => {
    expect(compare(emit('Mystery/<*>/Seen'), reg).unregistered).toHaveLength(1)
  })

  test('reports entries that nothing emits as dead, except indirect ones', () => {
    expect(compare(emit('Plain/Metric/Seen'), reg).dead.map(e => e.tag)).toEqual(['Family/<kind>/Seen', 'Open/<thing>/Seen'])
  })
})

describe('expandEntry', () => {
  test('returns the entry itself when it has no values', () => {
    expect(expandEntry({ tag: 'A/<x>/B', description: 'd' })).toEqual([{ tag: 'A/<x>/B', description: 'd' }])
  })

  test('fills the placeholder for each value, using value descriptions, then the template, then the entry description', () => {
    const expanded = expandEntry({ tag: 'A/<x>/B', description: 'family', valueDescription: '<v> happened', values: [['one', 'first'], 'two'] })
    expect(expanded).toEqual([{ tag: 'A/one/B', description: 'first' }, { tag: 'A/two/B', description: 'two happened' }])
  })
})

describe('appendToRegistry', () => {
  const stub = "    // src/a.js:1\n    { section: 'generic', tag: 'New/Thing', description: 'TODO: describe this metric' }"
  const write = (lastEntry) => {
    const file = path.join(require('os').tmpdir(), `registry-${Math.random()}.js`)
    fs.writeFileSync(file, `const registry = {\n  entries: [\n    { section: 'generic', tag: 'A' }${lastEntry}\n  ]\n}\n\nmodule.exports = registry\n`)
    return file
  }

  test('keeps the comma on the end of the last entry, even when a blank line follows it, so the file passes lint', () => {
    const file = write('\n')
    appendToRegistry(stub, file)

    expect(fs.readFileSync(file, 'utf8')).toContain("{ section: 'generic', tag: 'A' },\n\n    // src/a.js:1\n")
    expect(fs.readFileSync(file, 'utf8')).not.toMatch(/^\s*,/m)
  })

  test('does not add a second comma when the last entry already has one', () => {
    const file = write(',')
    appendToRegistry(stub, file)

    expect(fs.readFileSync(file, 'utf8')).toContain("tag: 'A' },\n\n")
    expect(fs.readFileSync(file, 'utf8')).not.toContain(',,')
  })

  test('produces a file that can be loaded, with the new entry last', () => {
    const file = write('\n')
    appendToRegistry(stub, file)

    expect(require(file).entries.map(entry => entry.tag)).toEqual(['A', 'New/Thing'])
  })

  test('appends more than once', () => {
    const file = write('')
    appendToRegistry(stub, file)
    appendToRegistry(stub.replace('New/Thing', 'Newer/Thing'), file)

    expect(require(file).entries.map(entry => entry.tag)).toEqual(['A', 'New/Thing', 'Newer/Thing'])
  })
})

describe('renderDocs', () => {
  test('renders sections, descriptions, and expanded values', () => {
    const docs = renderDocs({
      header: '# Title',
      sections: [{ id: 's', title: 'Section', intro: 'Intro text' }, { id: 'empty', title: 'Empty' }],
      entries: [{ section: 's', tag: 'A/<x>/B', description: 'family', values: ['one'] }]
    })

    expect(docs).toContain('### Section\nIntro text\n<!--- family --->\n* A/<x>/B\n  <!--- family --->\n  * A/one/B')
    expect(docs).not.toContain('### Empty')
  })
})

describe('renderStubs', () => {
  const reg = { sections: [{ id: 'ajax' }, { id: 'generic' }] }

  test('writes a placeholder entry for each unregistered metric, once, with its location', () => {
    const stubs = renderStubs([{ pattern: 'Ajax/New/Thing', file: 'a.js', line: 4 }, { pattern: 'Ajax/New/Thing', file: 'b.js', line: 9 }], reg)

    expect(stubs).toContain("// a.js:4\n    { section: 'ajax', tag: 'Ajax/New/Thing', description: '" + TODO_DESCRIPTION + "' }")
    expect(stubs).not.toContain('b.js')
  })

  test('names wildcard segments and falls back to the generic section', () => {
    expect(renderStubs([{ pattern: 'Unknown/<*>/Seen', file: 'a.js', line: 1 }], reg)).toContain("section: 'generic', tag: 'Unknown/<name>/Seen'")
  })

  test('a stub description fails the repository check until it is replaced', () => {
    const registry = { header: '', sections: [], entries: [{ section: 'generic', tag: 'Some/Stub', description: TODO_DESCRIPTION, indirect: 'test' }] }

    expect(checkRepo({ registry, docs: renderDocs(registry) }).some(error => error.includes('placeholder description'))).toBe(true)
  })

  test('a stub failure says which file and line to fill in', () => {
    const registry = { header: '', sections: [], entries: [{ section: 'generic', tag: 'Session/RaceCondition/Seen', description: TODO_DESCRIPTION, indirect: 'test' }] }
    const message = checkRepo({ registry, docs: renderDocs(registry) }).find(error => error.includes('placeholder description'))

    expect(message).toMatch(/tools\/supportability-metrics\/registry\.js:\d+/)
  })
})

describe('registryLocation', () => {
  const write = (content) => {
    const file = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'registry-')), 'registry.js')
    fs.writeFileSync(file, content)
    return file
  }

  test('returns the path and line of the entry with that tag', () => {
    const file = write("module.exports = {\n  entries: [\n    { tag: 'One/A' },\n    { tag: 'Two/B' }\n  ]\n}\n")

    expect(registryLocation('Two/B', file)).toMatch(/registry\.js:4$/)
  })

  test('returns just the path when the tag is not found', () => {
    expect(registryLocation('Missing/Tag', write('module.exports = {}\n'))).toMatch(/registry\.js$/)
  })

  test('points at the real registry when no path is given', () => {
    expect(registryLocation('Session/RaceCondition/Seen')).toMatch(/tools\/supportability-metrics\/registry\.js:\d+$/)
  })
})

describe('appendToPending', () => {
  const write = (content) => {
    const file = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'pending-')), 'pending.js')
    fs.writeFileSync(file, content)
    return file
  }

  test('adds tags to an empty list', () => {
    const file = write('module.exports = [\n]\n')
    appendToPending(['A/B/C', 'D/E/F'], file)

    expect(require(file)).toEqual(['A/B/C', 'D/E/F'])
  })

  test('adds tags after existing ones, including when the last one has no trailing comma', () => {
    const file = write("module.exports = [\n  'One/Existing'\n]\n")
    appendToPending(['Two/New'], file)

    expect(require(file)).toEqual(['One/Existing', 'Two/New'])
  })

  test('keeps the comments already in the list', () => {
    const file = write("module.exports = [\n  // why these are pending\n  'One/Existing'\n]\n")
    appendToPending(['Two/New'], file)

    expect(fs.readFileSync(file, 'utf8')).toContain('// why these are pending')
  })
})

describe('values that metrics report', () => {
  const emissionsOf = (code) => collectEmissions(code)

  test('the scanner notes whether a call passes a value', () => {
    expect(emissionsOf("reportSupportabilityMetric(ee, 'A/B', 5)")[0].hasValue).toBe(true)
    expect(emissionsOf("reportSupportabilityMetric(ee, 'A/B')")[0].hasValue).toBe(false)
    expect(emissionsOf("this.storeSupportabilityMetrics('A/B', count)")[0].hasValue).toBe(true)
    expect(emissionsOf("this.storeSupportabilityMetrics('A/B')")[0].hasValue).toBe(false)
  })

  test('a value of undefined is not a value', () => {
    expect(emissionsOf("reportSupportabilityMetric(ee, 'A/B', undefined)")[0].hasValue).toBe(false)
  })

  test('the raw handle form passes a value as the second item of the array', () => {
    expect(emissionsOf("handle(SUPPORTABILITY_METRIC_CHANNEL, ['A/B', 7], undefined, 'metrics', ee)")[0].hasValue).toBe(true)
    expect(emissionsOf("handle(SUPPORTABILITY_METRIC_CHANNEL, ['A/B'], undefined, 'metrics', ee)")[0].hasValue).toBe(false)
  })

  describe('checkValues', () => {
    const emit = (pattern, hasValue) => ({ pattern, file: 'f.js', line: 3, hasValue })

    test('passes when the declarations match the code', () => {
      const registry = { entries: [{ tag: 'A/Size', value: { unit: 'bytes' } }, { tag: 'A/Plain' }] }

      expect(checkValues([emit('A/Size', true), emit('A/Plain', false)], registry)).toEqual([])
    })

    test('fails when a call passes a value but the entry does not declare one', () => {
      const errors = checkValues([emit('A/Size', true)], { entries: [{ tag: 'A/Size' }] })

      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('"A/Size" is reported with a value (f.js:3)')
      expect(errors[0]).toContain("unit: 'ms' | 'bytes' | 'count'")
    })

    test('fails when an entry declares a value and nothing passes one', () => {
      expect(checkValues([emit('A/Size', false)], { entries: [{ tag: 'A/Size', value: { unit: 'bytes' } }] })[0]).toContain('declares a `value` but nothing in src/ passes one')
    })

    test('does not fail an entry that is reported some other way, or one nothing reports at all', () => {
      expect(checkValues([], { entries: [{ tag: 'A/Size', value: { unit: 'ms' }, indirect: 'raw stats' }, { tag: 'A/Other', value: { unit: 'ms' } }] })).toEqual([])
    })

    test('fails on a unit that does not exist, including the TODO placeholder a new stub starts with', () => {
      expect(checkValues([emit('A/Size', true)], { entries: [{ tag: 'A/Size', value: { unit: 'TODO' } }] })[0]).toContain('has the value unit "TODO"')
      expect(checkValues([emit('A/Size', true)], { entries: [{ tag: 'A/Size', value: { unit: 'minutes' } }] })[0]).toContain('one of: ms, bytes, count')
    })

    test('fails when a family restricts the value to names it does not have', () => {
      const registry = { entries: [{ tag: 'A/<x>', values: ['one', 'two'], value: { unit: 'ms', for: ['one', 'three'] } }] }

      expect(checkValues([emit('A/<*>', true)], registry)[0]).toContain('not among its values: three')
    })

    test('matches a family\'s call by shape', () => {
      expect(checkValues([emit('A/<*>', true)], { entries: [{ tag: 'A/<x>', values: ['one'], value: { unit: 'ms' } }] })).toEqual([])
    })
  })

  test('a stub for a new metric that passes a value starts with a TODO unit, so the check fails until it is set', () => {
    const stubs = renderStubs([{ pattern: 'A/New', file: 'a.js', line: 1, hasValue: true }], { sections: [{ id: 'a' }] })

    expect(stubs).toContain("value: { unit: 'TODO' }")
    expect(renderStubs([{ pattern: 'A/New', file: 'a.js', line: 1, hasValue: false }], { sections: [{ id: 'a' }] })).not.toContain('value:')
  })

  test('the docs say which metrics report a value, and in what unit', () => {
    const docs = renderDocs({ header: 'h', sections: [{ id: 's', title: 'S' }], entries: [{ section: 's', tag: 'A/Size', description: 'How big', value: { unit: 'bytes' } }, { section: 's', tag: 'A/Plain', description: 'Happened' }] })

    expect(docs).toContain('<!--- How big Reports a value (bytes). --->')
    expect(docs).toContain('<!--- Happened --->')
  })
})

describe('registry types', () => {
  test('the RegistrySectionId type lists exactly the sections in the registry, so editor hints stay accurate', () => {
    const types = fs.readFileSync(path.join(__dirname, '../../../../tools/supportability-metrics/registry-types.js'), 'utf8')
    const union = types.match(/@typedef \{([^}]*)\} RegistrySectionId/)[1]
    const typed = [...union.matchAll(/'([^']+)'/g)].map(match => match[1]).sort()

    expect(typed).toEqual(registry.sections.map(section => section.id).sort())
  })

  test('every entry refers to a section that exists', () => {
    const ids = registry.sections.map(section => section.id)

    expect(registry.entries.filter(entry => !ids.includes(entry.section)).map(entry => entry.tag)).toEqual([])
  })
})

describe('this repository', () => {
  test('src/ and the generated docs are in sync with the registry', () => {
    expect(checkRepo()).toEqual([])
  })

  test('the registry lists every framework the detection table can report', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../src/features/metrics/aggregate/framework-detection.js'), 'utf8')
    const detected = [...source.matchAll(/^ {2}\['(\w+)',/gm)].map(match => match[1]).sort()
    const entry = registry.entries.find(e => e.tag === 'Framework/<name>/Detected')

    expect(expandEntry(entry).map(e => e.tag.split('/')[1]).sort()).toEqual(detected)
  })
})
