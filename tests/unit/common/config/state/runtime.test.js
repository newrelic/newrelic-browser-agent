let getRuntime, setRuntime
beforeEach(async () => {
  jest.resetModules()
  ;({ getRuntime, setRuntime } = await import('../../../../../src/common/config/state/runtime.js'))
})

test('set/getRuntime should throw on an invalid agent id', () => {
  // currently only checks if it's a truthy value
  expect(() => setRuntime(undefined, {})).toThrow('require an agent id')
  expect(() => getRuntime(undefined)).toThrow('require an agent id')
  expect(() => setRuntime('', {})).toThrow('require an agent id')
  expect(() => getRuntime('')).toThrow('require an agent id')
})

test('set/getRuntime works correctly', () => {
  expect(() => setRuntime(123, { session: 1 })).not.toThrow() // notice setRuntime accepts numbers
  let cachedObj = getRuntime('123')
  expect(Object.keys(cachedObj).length).toBeGreaterThan(1)
  expect(cachedObj.session).toEqual(1)
  expect(cachedObj.maxBytes).toEqual(30000) // this should mirror default in runtime.js
})

test('set/getRuntime should respect readonly properties', () => {
  setRuntime('123', {
    buildEnv: 'foo',
    distMethod: 'bar',
    version: 'biz',
    originTime: 'baz'
  })
  let cachedObj = getRuntime('123')

  expect(cachedObj.buildEnv).toEqual('NPM')
  expect(cachedObj.distMethod).toEqual('NPM')
  expect(cachedObj.version).toEqual(expect.any(String))
  expect(cachedObj.version).not.toEqual('biz')
  expect(cachedObj.originTime).toEqual(expect.any(Number))
  expect(cachedObj.originTime).not.toEqual('baz')
})

test('accessing harvestCount should increment it', () => {
  setRuntime('123', {
    buildEnv: 'foo',
    distMethod: 'bar',
    version: 'biz',
    originTime: 'baz'
  })
  let cachedObj = getRuntime('123')

  expect(cachedObj.harvestCount).not.toEqual(cachedObj.harvestCount)
})
