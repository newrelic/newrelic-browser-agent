import { getEnabledFeatures } from '../../../../src/loaders/features/enabled-features'

jest.mock('../../../../src/loaders/features/features', () => ({
  FEATURE_NAMES: {
    a: 'jserrors',
    b: 'metrics',
    c: 'session_trace',
    d: 'soft_navigations',
    e: 'nonexistent'
  }
}))

test('getEnabledFeatures works', () => {
  const retMap = getEnabledFeatures({
    jserrors: { enabled: false },
    metrics: { enabled: true },
    session_trace: { enabled: false },
    soft_navigations: { enabled: false }
  })
  expect(retMap.jserrors).toEqual(false)
  expect(retMap.metrics).toEqual(true)
  expect(retMap.session_trace).toEqual(false)
  expect(retMap.soft_navigations).toEqual(false)
  expect(retMap.nonexistent).toEqual(false) // guards against invalid features not listed in init from being considered enabled
})
