const fs = require('fs')
const path = require('path')
const { collectEmissions, compare, expandEntry, renderDocs, renderStubs, appendToPending, checkRepo, TODO_DESCRIPTION } = require('../../../../tools/supportability-metrics/lib')
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
