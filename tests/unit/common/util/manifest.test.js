/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseManifest, matchManifestAsset } from '../../../../src/common/v2/manifest'

describe('manifest utilities', () => {
  describe('parseManifest', () => {
    test('returns undefined for undefined/null input', () => {
      expect(parseManifest(undefined)).toBeUndefined()
      expect(parseManifest(null)).toBeUndefined()
    })

    test('returns undefined when assets is missing, not an array, or empty', () => {
      expect(parseManifest({})).toBeUndefined()
      expect(parseManifest({ assets: 'not-an-array' })).toBeUndefined()
      expect(parseManifest({ assets: [] })).toBeUndefined()
    })

    test('returns undefined when every supplied asset is unrecognized', () => {
      expect(parseManifest({ assets: [123, null, {}] })).toBeUndefined()
    })

    test('infers isScript from a .js suffix on a bare string path', () => {
      const parsed = parseManifest({ assets: ['bundle.js', 'styles.css'] })
      expect(parsed.assets).toHaveLength(2)
      expect(parsed.scripts).toHaveLength(1)
      expect(parsed.scripts[0].pattern).toBe('bundle.js')
    })

    test('infers isScript false for a bare RegExp entry (documented limitation)', () => {
      const parsed = parseManifest({ assets: [/bundle\.js$/] })
      expect(parsed.assets).toHaveLength(1)
      expect(parsed.scripts).toHaveLength(0)
      expect(parsed.assets[0].isScript).toBe(false)
    })

    test('AssetFile explicit type overrides extension inference', () => {
      const parsed = parseManifest({ assets: [{ path: 'weird-name', type: 'js' }, { path: 'other.js', type: 'css' }] })
      expect(parsed.scripts.map(a => a.pattern)).toEqual(['weird-name'])
    })
  })

  describe('matchManifestAsset', () => {
    test('returns false for an undefined manifest or falsy url', () => {
      expect(matchManifestAsset(undefined, 'https://example.com/a.js')).toBe(false)
      expect(matchManifestAsset(parseManifest({ assets: ['a.js'] }), '')).toBe(false)
    })

    test('matches a string path as a substring, including URLs with trailing query strings', () => {
      const parsed = parseManifest({ assets: ['checkout/bundle.js'] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/bundle.js?v=3')).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/other/bundle.js')).toBe(false)
    })

    test('matches a RegExp entry via test()', () => {
      const parsed = parseManifest({ assets: [/\/checkout\/.+\.js$/] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/bundle.js')).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/styles.css')).toBe(false)
    })

    test('scriptsOnly excludes non-script assets even if the pattern would otherwise match', () => {
      const parsed = parseManifest({ assets: ['image.png', 'bundle.js'] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/image.png', { scriptsOnly: true })).toBe(false)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/image.png', { scriptsOnly: false })).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/bundle.js', { scriptsOnly: true })).toBe(true)
    })
  })
})
