import { isMinifiedLoader, planChecks, planAliases, summarizeFindings } from '../../../.github/actions/shared-utils/integrity'

/**
 * Builds a release as the monitor sees it: a version and the keys of its integrity manifest.
 * @param {string} version
 * @param {string[]} keys
 * @returns {{version: string, manifest: {files: Record<string, {sha384: string}>}}}
 */
const release = (version, keys) => ({
  version,
  manifest: { files: Object.fromEntries(keys.map(key => [key, { sha384: 'sha384-x' }])) }
})

describe('isMinifiedLoader', () => {
  test.each([
    'nr-loader-rum-1.324.1.min.js',
    'nr-loader-full-1.324.1.min.js',
    'nr-loader-spa-1.324.1.min.js',
    'nr-loader-spa-polyfills-1.324.1.min.js',
    'nr-full-1.302.0.min.js',
    'nr-loader-spa-1228.min.js'
  ])('matches the entry-point loader %s', key => {
    expect(isMinifiedLoader(key)).toBe(true)
  })

  test.each([
    ['unminified build', 'nr-loader-rum-1.324.1.js'],
    ['sourcemap', 'nr-loader-rum-1.324.1.min.js.map'],
    ['license', 'nr-loader-rum-1.324.1.min.js.LICENSE.txt'],
    ['aggregate chunk', 'ajax-aggregate.6e2218bf-1.324.1.min.js'],
    ['compressor chunk', 'nr-full-compressor-1.302.0.min.js'],
    ['mutable pointer', 'nr-loader-rum-1.x.x.min.js'],
    ['minor-line pointer', 'nr-loader-rum-1.324.x.min.js'],
    ['current alias', 'nr-loader-rum-current.min.js'],
    ['analyzer report', 'nr-full-standard-1.324.1.stats.html']
  ])('does not match a %s', (_, key) => {
    expect(isMinifiedLoader(key)).toBe(false)
  })
})

describe('planChecks', () => {
  const keys = [
    'nr-loader-rum-1.0.0.min.js',
    'nr-loader-rum-1.0.0.js',
    'nr-loader-rum-1.0.0.min.js.map',
    'ajax-aggregate.abc12345-1.0.0.min.js'
  ]

  test('checks every .js file of the newest releases', () => {
    const [plan] = planChecks([release('1.0.0', keys)], 1)

    expect(plan.tier).toBe('full')
    expect(plan.keys).toEqual([
      'nr-loader-rum-1.0.0.min.js',
      'nr-loader-rum-1.0.0.js',
      'ajax-aggregate.abc12345-1.0.0.min.js'
    ])
  })

  test('checks only the minified loaders of older releases', () => {
    const plans = planChecks([release('2.0.0', []), release('1.0.0', keys)], 1)

    expect(plans[1].tier).toBe('loaders')
    expect(plans[1].keys).toEqual(['nr-loader-rum-1.0.0.min.js'])
  })

  test('applies the full check to exactly the requested number of newest releases', () => {
    const plans = planChecks([release('3.0.0', keys), release('2.0.0', keys), release('1.0.0', keys)], 2)

    expect(plans.map(p => p.tier)).toEqual(['full', 'full', 'loaders'])
  })

  test('keeps only keys containing the include text, matched literally', () => {
    const [plan] = planChecks([release('1.0.0', keys)], 1, 'ajax-aggregate.')

    expect(plan.keys).toEqual(['ajax-aggregate.abc12345-1.0.0.min.js'])
  })

  test('does not treat the include text as a pattern', () => {
    const [plan] = planChecks([release('1.0.0', keys)], 1, '.*')

    expect(plan.keys).toEqual([])
  })

  test('returns no keys for a manifest without files instead of throwing', () => {
    const [plan] = planChecks([{ version: '1.0.0', manifest: {} }], 1)

    expect(plan.keys).toEqual([])
  })

  test('preserves the version and manifest of each release', () => {
    const input = release('1.0.0', keys)
    const [plan] = planChecks([input], 1)

    expect(plan.version).toBe('1.0.0')
    expect(plan.manifest).toBe(input.manifest)
  })
})

describe('planAliases', () => {
  /**
   * Builds a release whose manifest holds the minified rum loader with a digest derived from the given label.
   * @param {string} version
   * @param {string} label
   * @returns {{version: string, manifest: object}}
   */
  const withLoader = (version, label) => ({
    version,
    manifest: { files: { [`nr-loader-rum-${version}.min.js`]: { sha384: `sha384-${label}` } } }
  })
  const find = (plans, key) => plans.find(p => p.key === key)

  test('allows -current to match any release', () => {
    const plans = planAliases([withLoader('1.2.1', 'b'), withLoader('1.1.0', 'a')])

    expect(find(plans, 'nr-loader-rum-current.min.js').digests.sort()).toEqual(['sha384-a', 'sha384-b'])
  })

  test('allows a minor-line alias to match only releases of that line', () => {
    const plans = planAliases([withLoader('1.2.1', 'b'), withLoader('1.2.0', 'a'), withLoader('1.1.0', 'c')])

    expect(find(plans, 'nr-loader-rum-1.2.x.min.js').digests.sort()).toEqual(['sha384-a', 'sha384-b'])
    expect(find(plans, 'nr-loader-rum-1.1.x.min.js').digests).toEqual(['sha384-c'])
  })

  test('allows 1.x.x to match any 1.x release', () => {
    const plans = planAliases([withLoader('1.2.1', 'b'), withLoader('1.1.0', 'a')])

    expect(find(plans, 'nr-loader-rum-1.x.x.min.js').digests.sort()).toEqual(['sha384-a', 'sha384-b'])
  })

  test('requires only -current and 1.x.x of the unsuffixed loaders', () => {
    const plans = planAliases([withLoader('1.2.0', 'a')])

    expect(find(plans, 'nr-loader-rum-current.min.js').required).toBe(true)
    expect(find(plans, 'nr-loader-rum-1.x.x.min.js').required).toBe(true)
    expect(find(plans, 'nr-loader-rum-1.2.x.min.js').required).toBe(false)
  })

  test('ignores releases whose version is not major.minor.patch', () => {
    const plans = planAliases([withLoader('1216', 'a')])

    expect(plans).toEqual([])
  })

  test('omits aliases for loaders no release has', () => {
    const plans = planAliases([withLoader('1.2.0', 'a')])

    expect(find(plans, 'nr-loader-spa-current.min.js')).toBeUndefined()
  })

  test('does not deduplicate across lines, and deduplicates identical digests within one', () => {
    const plans = planAliases([withLoader('1.2.1', 'a'), withLoader('1.2.0', 'a')])

    expect(find(plans, 'nr-loader-rum-1.2.x.min.js').digests).toEqual(['sha384-a'])
  })

  test('accepts an alias digest a release records under unverified.aliases', () => {
    const release = withLoader('1.2.0', 'a')
    release.manifest.unverified = { aliases: { 'nr-loader-rum-1.2.x.min.js': 'sha384-variant' } }
    const plans = planAliases([release])

    expect(find(plans, 'nr-loader-rum-1.2.x.min.js').digests.sort()).toEqual(['sha384-a', 'sha384-variant'])
  })

  test('does not apply a recorded alias digest to a different alias', () => {
    const release = withLoader('1.2.0', 'a')
    release.manifest.unverified = { aliases: { 'nr-loader-rum-1.2.x.min.js': 'sha384-variant' } }
    const plans = planAliases([release])

    expect(find(plans, 'nr-loader-rum-current.min.js').digests).toEqual(['sha384-a'])
    expect(find(plans, 'nr-loader-rum-1.x.x.min.js').digests).toEqual(['sha384-a'])
  })
})

describe('summarizeFindings', () => {
  test('counts findings by kind and names the failing releases newest first', () => {
    const summary = summarizeFindings([
      { kind: 'mismatch', version: '1.9.0' },
      { kind: 'mismatch', version: '1.10.0' },
      { kind: 'unavailable', version: '1.10.0' }
    ])

    expect(summary.failure_count).toBe('3')
    expect(summary.failing_versions).toBe('1.10.0, 1.9.0')
    expect(summary.failure_summary).toBe('2 mismatch(es), 1 unavailable; releases: 1.10.0, 1.9.0')
  })

  test('names failing aliases separately from releases', () => {
    const summary = summarizeFindings([
      { kind: 'mismatch', alias: 'nr-loader-rum-current.min.js' },
      { kind: 'mismatch', alias: 'nr-loader-rum-current.min.js' }
    ])

    expect(summary.failing_aliases).toBe('nr-loader-rum-current.min.js')
    expect(summary.failing_versions).toBe('')
    expect(summary.failure_summary).toBe('2 mismatch(es), 0 unavailable; aliases: nr-loader-rum-current.min.js')
  })

  test('limits a long list of releases and says how many were left out', () => {
    const findings = Array.from({ length: 25 }, (_, i) => ({ kind: 'mismatch', version: `1.${i}.0` }))
    const summary = summarizeFindings(findings)

    expect(summary.failing_versions.endsWith('(+5 more)')).toBe(true)
    expect(summary.failing_versions.split(',').length).toBe(20)
  })

  test('returns single-line strings', () => {
    const summary = summarizeFindings([{ kind: 'mismatch', version: '1.0.0\n2.0.0' }])

    expect(Object.values(summary).some(v => v.includes('\n'))).toBe(false)
  })
})
