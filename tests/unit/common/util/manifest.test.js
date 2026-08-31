/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import vm from 'vm'
import { parseManifest, matchManifestAsset } from '../../../../src/common/v2/manifest'

jest.mock('../../../../src/common/util/console')

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
      expect(parseManifest({ assets: [123, null, 'bundle.js', /bundle\.js$/, {}, { matcher: 123 }] })).toBeUndefined()
    })

    test('infers isScript from a .js suffix on a string matcher', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'bundle.js' }, { matcher: 'styles.css' }] })
      expect(parsed.assets).toHaveLength(2)
      expect(parsed.scripts).toHaveLength(1)
      expect(parsed.scripts[0].pattern).toBe('bundle.js')
    })

    test('infers isScript false for a RegExp matcher with no type override', () => {
      const parsed = parseManifest({ assets: [{ matcher: /bundle\.js$/ }] })
      expect(parsed.assets).toHaveLength(1)
      expect(parsed.scripts).toHaveLength(0)
      expect(parsed.assets[0].isScript).toBe(false)
    })

    test('type: "script" overrides inference for a RegExp matcher', () => {
      const parsed = parseManifest({ assets: [{ matcher: /bundle$/, type: 'script' }] })
      expect(parsed.scripts).toHaveLength(1)
      expect(parsed.assets[0].isScript).toBe(true)
    })

    test('type: "script" overrides inference for a string matcher with no .js suffix', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'extensionless-loader', type: 'script' }] })
      expect(parsed.scripts).toHaveLength(1)
    })

    test('an unrecognized type value falls back to inference instead of forcing isScript false', () => {
      // An invalid `type` must never override inference -- otherwise a typo'd `type` could silently break
      // stack-trace attribution for an otherwise-valid `.js` matcher.
      const parsed = parseManifest({ assets: [{ matcher: 'bundle.js', type: 'style' }] })
      expect(parsed.scripts).toHaveLength(1)
      expect(parsed.assets[0].isScript).toBe(true)
    })

    test('type: "asset" explicitly marks a .js-suffixed string matcher as non-script', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'bundle.js', type: 'asset' }] })
      expect(parsed.scripts).toHaveLength(0)
      expect(parsed.assets[0].isScript).toBe(false)
    })

    test('rejects an empty-string matcher instead of matching every URL', () => {
      // ''.includes('') is always true -- an empty string matcher must be discarded, not treated as a valid
      // substring matcher that would otherwise match every resolved URL on the page.
      const parsed = parseManifest({ assets: [{ matcher: '' }, { matcher: 'styles.css' }] })
      expect(parsed.assets).toHaveLength(1)
      expect(parsed.assets[0].pattern).toBe('styles.css')
    })

    test('logs a warning (code 80) for an invalid matcher and discards the entry', async () => {
      jest.resetModules()
      const consoleModule = await import('../../../../src/common/util/console')
      const manifestModule = await import('../../../../src/common/v2/manifest')

      const parsed = manifestModule.parseManifest({ assets: [{ matcher: {} }, { matcher: 'styles.css' }] })

      expect(parsed.assets).toHaveLength(1)
      expect(consoleModule.warn).toHaveBeenCalledWith(80, {})
    })

    test('logs a warning (code 80) for an unrecognized type value', async () => {
      jest.resetModules()
      const consoleModule = await import('../../../../src/common/util/console')
      const manifestModule = await import('../../../../src/common/v2/manifest')

      manifestModule.parseManifest({ assets: [{ matcher: 'bundle.js', type: 'stylesheet' }] })

      expect(consoleModule.warn).toHaveBeenCalledWith(80, 'stylesheet')
    })

    test('the invalid-matcher and invalid-type warnings share a single once-per-page gate', async () => {
      // A deliberate tradeoff: an invalid matcher and an invalid type both warn through the same single()-wrapped
      // emitter, so whichever kind of mistake is parsed first suppresses the warning for the other kind for the
      // rest of the page's life. Both invalid entries are still discarded/ignored correctly either way -- only the
      // warning itself is deduped, not the validation behavior.
      jest.resetModules()
      const consoleModule = await import('../../../../src/common/util/console')
      const manifestModule = await import('../../../../src/common/v2/manifest')

      const parsed = manifestModule.parseManifest({
        assets: [{ matcher: {} }, { matcher: 'bundle.js', type: 'stylesheet' }, { matcher: 'styles.css' }]
      })

      expect(parsed.assets).toHaveLength(2) // bundle.js (inference-only) + styles.css
      expect(parsed.assets.find(a => a.pattern === 'bundle.js').isScript).toBe(true)
      expect(consoleModule.warn).toHaveBeenCalledTimes(1)
      expect(consoleModule.warn).toHaveBeenCalledWith(80, {})
    })

    test('a manifest containing only non-script assets has an empty scripts subset', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'logo.png' }, { matcher: /\.woff2?$/ }] })
      expect(parsed.assets).toHaveLength(2)
      expect(parsed.scripts).toHaveLength(0)
    })

    test('treats bare strings and RegExps as unrecognized -- only AssetFile objects are accepted', () => {
      const parsed = parseManifest({ assets: ['bundle.js', /styles\.css$/, { matcher: 'styles.css' }] })
      expect(parsed.assets).toHaveLength(1)
      expect(parsed.assets[0].pattern).toBe('styles.css')
    })

    test('treats an AssetFile with a missing/invalid matcher as unrecognized', () => {
      const parsed = parseManifest({ assets: [{ type: 'script' }, { matcher: 123 }, { matcher: 'styles.css' }] })
      expect(parsed.assets).toHaveLength(1)
      expect(parsed.assets[0].pattern).toBe('styles.css')
    })

    test('recognizes a RegExp matcher constructed in a different realm, where `instanceof RegExp` is unsafe', () => {
      // A regex built via Node's vm module in a fresh context is a genuine RegExp, but fails `instanceof RegExp`
      // against this file's global -- the same failure mode as a Firefox WebDriver executeScript sandbox, or a
      // customer's manifest built inside an iframe/Worker. parseManifest must still recognize it.
      const foreignRegExp = vm.runInNewContext('/bundle\\.js$/')
      expect(foreignRegExp instanceof RegExp).toBe(false) // sanity check that this really is the cross-realm case

      const parsed = parseManifest({ assets: [{ matcher: foreignRegExp, type: 'script' }] })
      expect(parsed?.assets).toHaveLength(1)
      expect(parsed?.scripts).toHaveLength(1)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/bundle.js', { scriptsOnly: true })).toBe(true)
    })
  })

  describe('matchManifestAsset', () => {
    test('returns false for an undefined manifest or falsy url', () => {
      expect(matchManifestAsset(undefined, 'https://example.com/a.js')).toBe(false)
      expect(matchManifestAsset(parseManifest({ assets: [{ matcher: 'a.js' }] }), '')).toBe(false)
    })

    test('matches a string matcher as a substring, including URLs with trailing query strings', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'checkout/bundle.js' }] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/bundle.js?v=3')).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/other/bundle.js')).toBe(false)
    })

    test('matches a RegExp matcher via test()', () => {
      const parsed = parseManifest({ assets: [{ matcher: /\/checkout\/.+\.js$/ }] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/bundle.js')).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/styles.css')).toBe(false)
    })

    test('scriptsOnly excludes non-script assets even if the pattern would otherwise match', () => {
      const parsed = parseManifest({ assets: [{ matcher: 'image.png' }, { matcher: 'bundle.js' }] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/image.png', { scriptsOnly: true })).toBe(false)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/image.png', { scriptsOnly: false })).toBe(true)
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/bundle.js', { scriptsOnly: true })).toBe(true)
    })

    test('scriptsOnly includes a type: "script"-overridden RegExp matcher', () => {
      const parsed = parseManifest({ assets: [{ matcher: /\/checkout\/loader$/, type: 'script' }] })
      expect(matchManifestAsset(parsed, 'https://cdn.example.com/checkout/loader', { scriptsOnly: true })).toBe(true)
    })
  })
})
