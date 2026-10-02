import { evaluateConfig } from '../../../../../src/features/metrics/aggregate/config-metrics'
import { mergeInit } from '../../../../../src/common/config/init'

test('reports true booleans as Enabled by their path, and does not report false ones', () => {
  const tags = evaluateConfig(mergeInit({ session_replay: { collect_fonts: true } }), mergeInit({}))

  expect(tags).toContain('Config/session_replay/collect_fonts/Enabled')
  expect(tags).not.toContain('Config/session_replay/inline_images/Enabled')
  expect(tags.filter(tag => tag.endsWith('/Disabled'))).toEqual([])
  expect(tags).toContain('Config/ajax/enabled/Enabled')
})

test('reports non-booleans as Changed only when they differ from the default', () => {
  const tags = evaluateConfig(mergeInit({ proxy: { assets: 'https://example.com' }, harvest: { interval: 60 } }), mergeInit({}))

  expect(tags).toContain('Config/proxy/assets/Changed')
  expect(tags).toContain('Config/harvest/interval/Changed')
  expect(tags).not.toContain('Config/proxy/beacon/Changed')
  expect(tags).not.toContain('Config/session/expiresMs/Changed')
})

test('compares arrays by content', () => {
  const tags = evaluateConfig(mergeInit({ user_actions: { elementAttributes: ['data-foo'] }, performance: { resources: { asset_types: [] } } }), mergeInit({}))

  expect(tags).toContain('Config/user_actions/elementAttributes/Changed')
  expect(tags).not.toContain('Config/performance/resources/asset_types/Changed')
})

test('never includes customer-provided values in a tag', () => {
  const tags = evaluateConfig(mergeInit({ proxy: { assets: 'https://secret.example.com' }, obfuscate: [{ regex: 'secret', replacement: 'x' }] }), mergeInit({}))

  expect(tags.join()).not.toContain('secret')
  expect(tags).toContain('Config/obfuscate/Changed')
})

test('does not report feature_flags as config', () => {
  const tags = evaluateConfig(mergeInit({ feature_flags: ['rum_v2'] }), mergeInit({}))

  expect(tags.filter(tag => tag.includes('feature_flags'))).toEqual([])
})

test('returns an empty array instead of throwing on bad input', () => {
  expect(evaluateConfig(undefined, mergeInit({}))).toEqual([])
})
