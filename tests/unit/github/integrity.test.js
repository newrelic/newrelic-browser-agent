import { isMinifiedLoader, planChecks } from '../../../.github/actions/shared-utils/integrity'

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
