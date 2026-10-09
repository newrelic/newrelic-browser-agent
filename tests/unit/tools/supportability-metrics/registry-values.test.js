import { FEATURE_NAMES } from '../../../../src/loaders/features/features'

const registry = require('../../../../tools/supportability-metrics/registry')
const valuesOf = (tag) => registry.entries.find(entry => entry.tag === tag).values.map(value => Array.isArray(value) ? value[0] : value)

describe('the values of the families whose names are known ahead of time', () => {
  test('the retried features are the agent\'s features, without the deprecated page_action', () => {
    const features = Object.values(FEATURE_NAMES).filter(name => name !== FEATURE_NAMES.pageAction)

    expect(valuesOf('Harvester/Retry/Attempted/<feature>').sort()).toEqual(features.sort())
  })

  test('a retry fails or succeeds with the same set of status codes', () => {
    expect(valuesOf('Harvester/Retry/Failed/<code>')).toEqual(valuesOf('Harvester/Retry/Succeeded/<code>'))
  })

  test('the retried status codes are the ones the harvester retries: 408, 429, 500, 502-504 and 512-530', () => {
    const codes = valuesOf('Harvester/Retry/Failed/<code>').map(Number)

    expect(codes).toHaveLength(3 + 3 + 19)
    expect(codes).toEqual(expect.arrayContaining([408, 429, 500, 502, 503, 504, 512, 530]))
    expect(codes).not.toContain(501)
    expect(codes).not.toContain(511)
  })

  test('each audit flag lists all four outcomes', () => {
    const audits = registry.entries.filter(entry => entry.tag.startsWith('audit/'))

    expect(audits.map(entry => entry.tag)).toEqual(['audit/page_view/hasReplay/<outcome>', 'audit/page_view/hasTrace/<outcome>', 'audit/session_replay/hasError/<outcome>'])
    audits.forEach(entry => expect(valuesOf(entry.tag)).toEqual(['false/positive', 'false/negative', 'true/positive', 'true/negative']))
  })

  test('the connect response errors list the status 0 of a request that never completed', () => {
    expect(valuesOf('BCS/Error/<code>')).toContain('0')
  })
})
