let getLoaderConfig, setLoaderConfig
beforeEach(async () => {
  jest.resetModules()
  ;({ getLoaderConfig, setLoaderConfig } = await import('../../../../src/common/config/loader-config.js'))
})

test('set/getLoaderConfig should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setLoaderConfig(undefined, {})).toThrow('require an agent id')
  expect(() => getLoaderConfig(undefined)).toThrow('require an agent id')
  expect(() => setLoaderConfig('', {})).toThrow('require an agent id')
  expect(() => getLoaderConfig('')).toThrow('require an agent id')
})

test('set/getLoaderConfig works correctly', () => {
  expect(() => setLoaderConfig(123, { trustKey: 1 })).not.toThrow() // notice setLoaderConfig accepts numbers
  let cachedObj = getLoaderConfig('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.trustKey).toEqual(1)
  expect(cachedObj.xpid).toBeUndefined() // this should mirror default in loader-config.js
})
