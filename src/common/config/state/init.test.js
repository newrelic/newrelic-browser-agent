let getConfiguration, setConfiguration, getConfigurationValue
beforeEach(async () => {
  jest.resetModules()
  ;({ getConfiguration, setConfiguration, getConfigurationValue } = await import('./init.js'))
})

test('set/getConfiguration should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setConfiguration(undefined, {})).toThrow('require an agent id')
  expect(() => getConfiguration(undefined)).toThrow('require an agent id')
  expect(() => setConfiguration('', {})).toThrow('require an agent id')
  expect(() => getConfiguration('')).toThrow('require an agent id')
})

test('set/getConfiguration works correctly', () => {
  expect(() => setConfiguration(123, { jserrors: { enabled: false } })).not.toThrow() // notice setConfiguration accepts numbers
  let cachedObj = getConfiguration('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.jserrors.enabled).toEqual(false)
  expect(cachedObj.page_action.enabled).toEqual(true) // this should mirror default in init.js
})

test('getConfigurationValue parses path correctly', () => {
  setConfiguration('ab', { page_action: { harvestTimeSeconds: 1000 } })
  expect(getConfigurationValue('ab', '')).toBeUndefined()
  expect(getConfigurationValue('ab', 'page_action')).toEqual({ enabled: true, harvestTimeSeconds: 1000, autoStart: true })
  expect(getConfigurationValue('ab', 'page_action.harvestTimeSeconds')).toEqual(1000)
})
